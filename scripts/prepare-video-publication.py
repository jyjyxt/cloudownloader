#!/usr/bin/env python3
"""Prepare platform metadata and covers from caller-owned text; never upload or publish."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

PLATFORMS = ('douyin', 'xiaohongshu', 'wechat_channels', 'youtube', 'bilibili')
LIMITS = {'douyin': (30, 1000), 'xiaohongshu': (20, 1000),
          'wechat_channels': (16, 1000), 'youtube': (100, 5000), 'bilibili': (80, 2000)}


def probe_video(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-show_entries',
                             'format=duration:stream=codec_type,width,height', '-of', 'json', str(path)],
                            capture_output=True, text=True, check=True)
    value = json.loads(result.stdout)
    video = next(stream for stream in value['streams'] if stream['codec_type'] == 'video')
    duration = float(value['format']['duration'])
    if duration <= 0 or video['width'] <= 0 or video['height'] <= 0:
        raise ValueError('Require a decodable video with positive duration and dimensions')
    return duration, [video['width'], video['height']]


def file_path(value, base):
    path = Path(value).expanduser()
    return (path if path.is_absolute() else base / path).resolve()


def digest(path):
    with path.open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()


def build_metadata(data, base, output, platforms=PLATFORMS):
    for key in ('video', 'account', 'title', 'description'):
        if not isinstance(data.get(key), str) or not data[key].strip():
            raise ValueError(f'Require nonempty {key}')
    video = file_path(data['video'], base)
    if not video.is_file() or video.stat().st_size == 0:
        raise ValueError('Video must be a nonempty file')
    duration, dimensions = probe_video(video)
    common = {'video': str(video), 'account': data['account'], 'title': data['title'],
              'video_sha256': digest(video), 'video_duration_seconds': duration,
              'video_dimensions': dimensions}
    tags = data.get('tags', [])
    if not isinstance(tags, list) or any(not isinstance(tag, str) or not tag.strip() for tag in tags):
        raise ValueError('tags must be a list of nonempty strings')
    texts = data.get('platform_text', {})
    if not isinstance(texts, dict):
        raise ValueError('platform_text must be an object')
    documents = {}
    for platform in platforms:
        result = dict(common)
        body = texts.get(platform, data['description'])
        if not isinstance(body, str) or not body.strip():
            raise ValueError(f'{platform}: require nonempty text')
        if platform == 'wechat_channels':
            result['title'] = data['title'].replace('，', ' ').replace(',', ' ')
        title_limit, text_limit = LIMITS[platform]
        if len(result['title']) > title_limit or '\n' in result['title'] or '\r' in result['title']:
            raise ValueError(f'{platform}: title must be one line, at most {title_limit} characters')
        if len(body) > text_limit:
            raise ValueError(f'{platform}: text exceeds {text_limit} characters; edit explicitly')
        if platform == 'xiaohongshu':
            result['content'] = body
        elif platform in ('douyin', 'wechat_channels'):
            result.update(caption=body, visibility=data.get('visibility', 'public'))
        else:
            result.update(description=body, tags=tags)
        if platform == 'bilibili':
            for key in ('category', 'bilibili_declaration'):
                if not isinstance(data.get(key), str) or not data[key].strip():
                    raise ValueError(f'Require explicit {key}')
            if not 1 <= len(tags) <= 10 or len(tags) != len(set(tags)) or any(
                    tag != tag.strip() or len(tag) > 20 or any(char in tag for char in ',\n\r') for tag in tags):
                raise ValueError('Bilibili requires 1–10 distinct tags of at most 20 characters, without commas')
            if data['bilibili_declaration'] not in ('内容无需标注', '含AI生成内容', '含虚构演绎内容', '内容含营销信息', '个人观点，仅供参考'):
                raise ValueError('Unsupported bilibili_declaration')
            result.update(category=data['category'], declaration=data['bilibili_declaration'])
            if data.get('account_id'):
                result['account_id'] = str(data['account_id'])
        if platform == 'wechat_channels':
            declaration = data.get('wechat_declaration')
            if declaration not in ('无需标注', '个人观点，仅供参考'):
                raise ValueError('Require explicit wechat_declaration: 无需标注 or 个人观点，仅供参考')
            original = data.get('original', False)
            if not isinstance(original, bool):
                raise ValueError('original must be boolean')
            result.update(declaration=declaration, original=original)
        if platform == 'youtube':
            kids = data.get('made_for_kids')
            if not isinstance(kids, bool):
                raise ValueError('Require explicit made_for_kids boolean for YouTube')
            result.update(visibility=data.get('youtube_visibility', 'Public'), made_for_kids=kids)
        # UI-only adapters do not apply local cover files. Keep those out of
        # their metadata; upload/crop/save the prepared images separately.
        if data.get('covers'):
            if platform == 'douyin':
                result['cover'] = str(output / 'cover_douyin_portrait.png')
            elif platform == 'youtube':
                result['cover'] = str(output / 'cover_youtube.png')
        documents[f'publish_{platform}.json'] = result
    return documents


def build_covers(covers, base):
    from PIL import Image, ImageOps
    if not isinstance(covers, dict) or not all(isinstance(covers.get(key), str) for key in ('portrait', 'landscape')):
        raise ValueError('covers requires portrait and landscape image paths')
    with Image.open(file_path(covers['portrait'], base)) as source:
        portrait = ImageOps.exif_transpose(source).convert('RGB')
    with Image.open(file_path(covers['landscape'], base)) as source:
        landscape = ImageOps.exif_transpose(source).convert('RGB')

    def fit(image, size):
        fitted = ImageOps.contain(image, size, Image.Resampling.LANCZOS)
        canvas = Image.new('RGB', size, 'black')
        canvas.paste(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
        return canvas

    vertical = fit(portrait, (720, 960))
    horizontal = fit(landscape, (1280, 720))
    bili = Image.new('RGB', (1440, 1080), 'black')
    bili.paste(horizontal.resize((1440, 810), Image.Resampling.LANCZOS), (0, 135))
    return {'cover_3x4.png': vertical, 'cover_youtube.png': horizontal, 'cover_bilibili.png': bili,
            'cover_douyin_portrait.png': vertical.resize((1080, 1440), Image.Resampling.LANCZOS)}


def prepare(metadata, output, platforms=PLATFORMS, overwrite=False):
    metadata, output = Path(metadata).resolve(), Path(output).resolve()
    data = json.loads(metadata.read_text())
    documents = build_metadata(data, metadata.parent, output, platforms)
    images = build_covers(data['covers'], metadata.parent) if data.get('covers') else {}
    # Validate all destinations before changing any existing draft.
    for name in documents:
        state = output / (name + '.state.json')
        if state.exists() and json.loads(state.read_text()).get('status') != 'prepared':
            raise ValueError(f'Refusing to overwrite submitted or uncertain metadata: {name}')
    for name in (*documents, *images):
        if (output / name).exists() and not overwrite:
            raise ValueError(f'Destination exists: {name}; use --overwrite only for an unpublished draft')
    output.mkdir(parents=True, exist_ok=True)
    for name, image in images.items():
        image.save(output / name)
    for name, document in documents.items():
        (output / name).write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n')
    return [str(output / name) for name in (*documents, *images)]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('metadata', help='Shared JSON: video, account, title, description and explicit platform options')
    parser.add_argument('--output-dir', required=True)
    parser.add_argument('--platforms', nargs='+', choices=PLATFORMS, default=PLATFORMS)
    parser.add_argument('--overwrite', action='store_true', help='Replace an unpublished preparation only')
    args = parser.parse_args()
    try:
        print(json.dumps({'prepared_files': prepare(args.metadata, args.output_dir, args.platforms, args.overwrite)}, ensure_ascii=False, indent=2))
    except (ValueError, OSError, subprocess.SubprocessError, KeyError, StopIteration) as error:
        parser.exit(1, f'{error}\n')
