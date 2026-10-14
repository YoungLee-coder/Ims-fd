# 文件上传与核验

申请材料（证件、材料扫描件）上传时先在浏览器端做格式与大小校验，上传后由工作人员逐份标记核验状态。全部核验通过后，申请才能在审批流程中继续往前走。

相关代码：

| 文件 | 内容 |
| --- | --- |
| `src/lib/upload.ts` | 上传前校验，三处上传入口共用 |
| `src/features/applications/application-documents.tsx` | 工作人员查看、代传、核验申请材料 |
| `src/features/applications/api.ts` | 申请材料接口与 hooks |

## 上传校验

`checkUploads(files, { existingNames, maxCount })` 依次检查每个文件，命中一条就不再往下看：

| 检查 | 规则 | 提示 |
| --- | --- | --- |
| 格式 | 扩展名为 `pdf` / `jpg` / `jpeg` / `png`（不区分大小写） | 格式不支持 |
| 空文件 | 大小为 0 | 文件为空 |
| 大小 | 不超过 10 MB（`ATTACHMENT_MAX_BYTES`） | 超过 10 MB |
| 重名 | 与已有材料或本批前面的文件同名（不区分大小写） | 已有同名文件 |
| 文件头 | 读前 8 个字节，与扩展名对应的 magic number 比对 | 文件内容与扩展名不符 |

最后再看份数：已有 + 本次通过的文件超过 10 份（`ATTACHMENT_MAX_COUNT`）时整批不上传。

文件头比对用来拦截改了扩展名的文件，例如把 `.docx` 改名成 `.pdf`：

| 格式 | 文件头 |
| --- | --- |
| PDF | `25 50 44 46`（`%PDF`） |
| JPEG | `FF D8 FF` |
| PNG | `89 50 4E 47 0D 0A 1A 0A` |

用到这个校验的地方：

- 门户申请向导的「申请材料」步骤
- 证件登记 / 编辑抽屉里的扫描件
- 工作人员在申请详情页代传扫描件

浏览器端校验只是为了尽早提示，**后端必须重复同样的校验**。

> 调用时先 `Array.from(input.files)` 再清空 input。`FileList` 跟 input 绑定，校验是异步的，先清空会拿到空列表。

## 核验状态

每份申请材料有一个核验状态，沿用证件的 `VerificationStatus`：

| 状态 | 含义 |
| --- | --- |
| `pending` 待核验 | 新上传的材料，包括工作人员代传的 |
| `verified` 已核验 | 核验人确认与申请信息一致 |
| `rejected` 已驳回 | 必须填写驳回原因，例如扫描不清晰 |

- 已核验或已驳回的材料可以重新核验，弹窗会带出上次的结论和意见。
- 核验记录核验人和时间，显示在材料下方。
- 只有申请处于待受理、审核中、待补件时才能代传和核验；通过、驳回、撤回后材料只读。
- 只有工作人员代传、且仍是待核验的材料可以删除；申请人上传的材料不能由工作人员删除。

材料还带有分类（护照扫描件、证件照片、证明材料、其他材料）和来源（申请人上传 / 窗口代传），方便核验时对照清单。

## 权限

| 操作 | 权限 |
| --- | --- |
| 查看申请材料 | 能打开申请详情即可（`applicant.read`） |
| 代传扫描件、删除代传材料 | `document.create` |
| 标记核验状态 | `document.verify` |

## 与审批的关系

有材料不是「已核验」时，「初审通过」和「通过并建档」按钮不可用，详情页提示还剩几份。「要求补件」「驳回」不受影响，材料有问题时可以直接走这两条路。见 [approval-workflow.md](./approval-workflow.md)。

## 后端接口约定

| 接口 | 说明 |
| --- | --- |
| `GET /applications/:id/documents` | `-> ApplicationDocument[]` |
| `POST /applications/:id/documents` | `multipart/form-data`，字段 `files`（可多个）和 `category`，`-> ApplicationDocument[]` |
| `DELETE /applications/:id/documents/:documentId` | `-> 204`，仅限代传且待核验的材料 |
| `PUT /applications/:id/documents/:documentId/verification` | `{ verification: "verified" \| "rejected", note }` `-> ApplicationDocument` |

```ts
interface ApplicationDocument {
  id: string
  applicationId: string
  fileName: string
  mimeType: string
  size: number
  url: string
  uploadedAt: string
  category: "passport_scan" | "photo" | "supporting" | "other"
  source: "applicant" | "staff"
  verification: "pending" | "verified" | "rejected"
  verificationNote: string
  verifiedBy: string | null
  verifiedAt: string | null
}
```

后端需要：

1. 申请人在门户上传的附件也要出现在这个列表里，`source` 为 `applicant`，`category` 无法判断时用 `other`。
2. 上传时重复前端的格式、文件头、大小、份数校验，不通过返回 400 并在 `message` 里说明原因。
3. 驳回时 `note` 不能为空。
4. 申请人补件后新上传的材料是 `pending`，已有材料的核验结果保留。

## 兼容旧版后端

`GET /applications/:id/documents` 请求失败（例如旧版后端返回 404）时不重试，直接回退为原来的附件列表：不显示核验状态，也不拦审批。
