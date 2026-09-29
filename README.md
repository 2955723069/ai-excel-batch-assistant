# AI批量办公助手

MVP 第一版聚焦「AI销售线索批量分析」。当前完成首页、Excel 解析、字段映射与本地文件任务持久化。

## 本地启动

```bash
npm install
cp .env.example .env.local
```

任务数据保存在本机 `data/` 目录，不需要安装或配置数据库：

```env
JOBS_DATA_DIR=./data
MAX_ROWS_PER_TASK=1000
MAX_FILE_SIZE_MB=10
```

启动开发服务：

```bash
npm run dev
```

访问 <http://localhost:3000>。

## Phase 2 能力

- 接受 `.xlsx`、`.xls`、`.csv`，服务端强制校验格式、大小和最大行数
- 上传预检会读取首个工作表、展示真实表头和数据行数
- 可映射聊天记录列，并可选映射客户 ID、客户名称列
- 创建任务时服务端重新解析和校验文件，再写入 `data/jobs/<job_id>/`
- 每个任务保存 `job.json`、`items.jsonl` 和原始 `input.xlsx`
- 使用随机 owner cookie 限制任务列表和详情只显示当前浏览器创建的任务
- `/jobs` 显示数据库任务；`/jobs/[id]` 显示记录数、状态和映射

## API

- `POST /api/jobs/preview`：multipart/form-data `file`，返回表头、行数、文件名和大小
- `POST /api/jobs`：multipart/form-data `file`、`templateId=sales-lead`、`conversationColumn`，可选 `customerIdColumn` / `customerNameColumn`
- `GET /api/jobs`：列出当前浏览器创建的任务
- `GET /api/jobs/[id]`：读取当前浏览器拥有的任务

队列、后台 Worker、模型调用、实时进度和结果导出尚未启用。创建的任务目前保持 `queued` 状态。
