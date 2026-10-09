import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image

spec = importlib.util.spec_from_file_location('preparation', Path(__file__).with_name('prepare-video-publication.py'))
preparation = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preparation)


class PublicationPreparationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name)
        (self.base / 'film.mp4').write_bytes(b'nonempty fixture')
        self.data = {'video': 'film.mp4', 'account': 'creator', 'title': '用一张字幕图，表达一个完整观点',
                     'description': 'José / HUMAN\n原始来源 https://example.com/?a=1&b=2',
                     'tags': ['字幕拼图', '效率工具'], 'category': '知识',
                     'bilibili_declaration': '内容无需标注', 'wechat_declaration': '无需标注',
                     'made_for_kids': False}
        self.probe = patch.object(preparation, 'probe_video', return_value=(48.7666667, [720, 1280]))
        self.probe.start()
        self.addCleanup(self.probe.stop)

    def test_metadata_matches_current_adapter_contracts_and_preserves_text(self):
        self.data['covers'] = {'portrait': 'portrait.png', 'landscape': 'landscape.png'}
        documents = preparation.build_metadata(self.data, self.base, self.base / 'output')
        channels = documents['publish_wechat_channels.json']
        self.assertEqual(channels['title'], '用一张字幕图 表达一个完整观点')
        self.assertEqual(channels['caption'], self.data['description'])
        self.assertEqual(documents['publish_xiaohongshu.json']['content'], self.data['description'])
        for platform in ('wechat_channels', 'xiaohongshu', 'bilibili'):
            self.assertNotIn('cover', documents[f'publish_{platform}.json'])
            self.assertNotIn('cover_url', documents[f'publish_{platform}.json'])
        self.assertTrue(documents['publish_douyin.json']['cover'].endswith('cover_douyin_portrait.png'))
        for document in documents.values():
            self.assertEqual(document['video_duration_seconds'], 48.7666667)
            self.assertEqual(document['video_sha256'], preparation.digest(self.base / 'film.mp4'))
        self.assertFalse(channels['original'])

    def test_limits_block_silent_truncation_and_keep_platform_specific_text(self):
        self.data['platform_text'] = {'douyin': '明确指定的正文 #字幕拼图'}
        documents = preparation.build_metadata(self.data, self.base, self.base)
        self.assertEqual(documents['publish_douyin.json']['caption'], self.data['platform_text']['douyin'])
        self.data['platform_text']['douyin'] = '字' * 1001
        with self.assertRaisesRegex(ValueError, '1000'):
            preparation.build_metadata(self.data, self.base, self.base)
        self.data.pop('platform_text')
        self.data['title'] = '字' * 21
        with self.assertRaisesRegex(ValueError, '20'):
            preparation.build_metadata(self.data, self.base, self.base, ['xiaohongshu'])

    def test_cover_sizes_keep_all_landscape_pixels_inside_both_bilibili_crops(self):
        Image.new('RGB', (720, 960), 'red').save(self.base / 'portrait.png')
        Image.new('RGB', (1280, 720), 'yellow').save(self.base / 'landscape.png')
        covers = preparation.build_covers({'portrait': 'portrait.png', 'landscape': 'landscape.png'}, self.base)
        self.assertEqual(covers['cover_douyin_portrait.png'].size, (1080, 1440))
        self.assertEqual(covers['cover_3x4.png'].size, (720, 960))
        self.assertEqual(covers['cover_youtube.png'].size, (1280, 720))
        bili = covers['cover_bilibili.png']
        self.assertEqual(bili.size, (1440, 1080))
        self.assertEqual(bili.crop((0, 0, 1440, 135)).getbbox(), None)
        self.assertEqual(bili.crop((0, 945, 1440, 1080)).getbbox(), None)
        self.assertEqual(bili.getpixel((0, 135)), (255, 255, 0))
        self.assertEqual(bili.getpixel((1439, 944)), (255, 255, 0))

    def test_full_image_is_preserved_when_source_aspect_ratio_differs(self):
        Image.new('RGB', (500, 500), 'red').save(self.base / 'portrait.png')
        Image.new('RGB', (300, 300), 'yellow').save(self.base / 'landscape.png')
        covers = preparation.build_covers({'portrait': 'portrait.png', 'landscape': 'landscape.png'}, self.base)
        self.assertEqual(covers['cover_3x4.png'].getpixel((0, 120)), (255, 0, 0))
        self.assertEqual(covers['cover_3x4.png'].getpixel((719, 839)), (255, 0, 0))

    def test_does_not_overwrite_uncertain_or_published_metadata(self):
        metadata = self.base / 'input.json'
        metadata.write_text(json.dumps(self.data))
        output = self.base / 'output'
        preparation.prepare(metadata, output)
        original = (output / 'publish_douyin.json').read_bytes()
        for status in ('submitting', 'submitted', 'published', 'published_unverified'):
            (output / 'publish_douyin.json.state.json').write_text(json.dumps({'status': status}))
            with self.assertRaisesRegex(ValueError, 'Refusing'):
                preparation.prepare(metadata, output, overwrite=True)
            self.assertEqual((output / 'publish_douyin.json').read_bytes(), original)

    def test_validates_before_writing_and_requires_explicit_declarations(self):
        self.data.pop('wechat_declaration')
        metadata = self.base / 'input.json'
        metadata.write_text(json.dumps(self.data))
        output = self.base / 'output'
        with self.assertRaisesRegex(ValueError, 'wechat_declaration'):
            preparation.prepare(metadata, output)
        self.assertFalse(output.exists())

    def test_invalid_tags_and_declarations_match_the_publisher_contract(self):
        for tags in ([' tag'], ['tag\nline'], ['tag,tag'], ['same', 'same']):
            data = dict(self.data, tags=tags)
            with self.assertRaisesRegex(ValueError, 'Bilibili'):
                preparation.build_metadata(data, self.base, self.base, ['bilibili'])
        with self.assertRaisesRegex(ValueError, 'Unsupported'):
            preparation.build_metadata(dict(self.data, bilibili_declaration='unsupported'), self.base, self.base, ['bilibili'])


if __name__ == '__main__':
    unittest.main()
