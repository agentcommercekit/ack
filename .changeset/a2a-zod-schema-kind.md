---
"@agentcommercekit/ack-id": minor
---

The Zod A2A schemas now describe the same messages as their Valibot twins.

`@agentcommercekit/ack-id/a2a/schemas/zod` still described the pre-0.3 A2A
shape: parts were discriminated on `type` rather than `kind`, and `messageSchema`
required neither `kind: "message"` nor `messageId`. The Valibot schemas moved to
the `@a2a-js/sdk` shape and the Zod ones were left behind, so the two entry
points disagreed about the same message. A handshake message produced by
`createA2AHandshakeMessage` failed Zod validation, while a message shaped for
the Zod schemas was rejected at verification time by `verifyA2AHandshakeMessage`.

`messageSchema` now requires `kind: "message"` and `messageId` and accepts
`taskId`, `contextId`, `extensions`, and `referenceTaskIds`. `partSchema`
discriminates on `kind`. `fileContentSchema` is replaced by `fileWithBytesSchema`
and `fileWithUriSchema`, matching the Valibot exports, and a file part accepts
either.
