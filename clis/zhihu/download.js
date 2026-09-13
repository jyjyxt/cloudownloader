/**
 * Zhihu download — export column articles or answers to Markdown.
 */
import { cli, Strategy } from '@jyjyxt/cloudl/registry';
import { downloadArticle } from '@jyjyxt/cloudl/download/article-download';
import { ArgumentError } from '@jyjyxt/cloudl/errors';
import {
    extractAnswer,
    extractColumnArticle,
    parseDownloadTarget,
} from './download-helpers.js';

cli({
    site: 'zhihu',
    name: 'download',
    access: 'read',
    description: '导出知乎专栏文章或回答为 Markdown 格式',
    domain: 'www.zhihu.com',
    strategy: Strategy.COOKIE,
    navigateBefore: false,
    args: [
        { name: 'url', required: true, help: 'Column article URL, answer ID, typed target, or answer URL' },
        { name: 'output', default: './zhihu-articles', help: 'Output directory' },
        { name: 'download-images', type: 'boolean', default: false, help: 'Download images locally' },
    ],
    columns: ['title', 'author', 'publish_time', 'status', 'size'],
    func: async (page, kwargs) => {
        const target = parseDownloadTarget(kwargs.url);
        if (!target) {
            throw new ArgumentError(
                'Target must be a Zhihu column article URL, answer ID, typed answer target, or answer URL',
                'Example: cloudl zhihu download --url "https://www.zhihu.com/question/123/answer/456"',
            );
        }
        const data = target.kind === 'answer'
            ? await extractAnswer(page, target)
            : { ...await extractColumnArticle(page, target), sourceUrl: target.url };
        return downloadArticle({
            title: data?.title || '',
            author: data?.author,
            publishTime: data?.publishTime,
            sourceUrl: data?.sourceUrl,
            contentHtml: data?.contentHtml || '',
            imageUrls: data?.imageUrls,
        }, {
            output: kwargs.output,
            downloadImages: kwargs['download-images'],
            imageHeaders: { Referer: target.kind === 'answer' ? 'https://www.zhihu.com/' : 'https://zhuanlan.zhihu.com/' },
            ...(target.kind === 'answer' && { requireImageContentType: true }),
        });
    },
});
