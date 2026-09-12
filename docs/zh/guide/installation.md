# 安装

## 系统要求

- **Node.js**: >= 20.18.1，或 **Bun** >= 1.0
- **Chrome** 已运行并登录目标网站（浏览器命令需要）

## 从源码安装

```bash
git clone https://github.com/jyjyxt/cloudownloader.git
cd cloudownloader
npm install
npm run build
npm link
ClouDownloader list
```

## 更新

```bash
cd /path/to/cloudownloader
git pull --ff-only
npm install
npm link

# 如果你在用打包发布的 OpenCLI skills，也一起刷新
npx skills add jyjyxt/cloudownloader
```

如果你只装了部分 skill，也可以只刷新自己在用的：

```bash
npx skills add jyjyxt/cloudownloader --skill opencli-adapter-author
npx skills add jyjyxt/cloudownloader --skill opencli-autofix
npx skills add jyjyxt/cloudownloader --skill opencli-browser
npx skills add jyjyxt/cloudownloader --skill opencli-browser-sitemap
npx skills add jyjyxt/cloudownloader --skill opencli-sitemap-author
npx skills add jyjyxt/cloudownloader --skill opencli-usage
npx skills add jyjyxt/cloudownloader --skill smart-search
```

## 验证安装

```bash
ClouDownloader --version
ClouDownloader list
ClouDownloader doctor
```
