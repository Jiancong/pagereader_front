import { streamText } from "ai"

export async function POST(req: Request) {
  const { messages } = await req.json()

  const systemPrompt = `你是一个专业的演示文稿设计专家。用户会给你一个主题或描述，你需要生成一个结构化的PPT大纲。

请严格按照以下JSON格式输出，不要有任何其他文字：

\`\`\`json
[
  {
    "title": "幻灯片标题",
    "content": ["要点1", "要点2", "要点3"]
  }
]
\`\`\`

要求：
1. 生成8-12页幻灯片
2. 第一页应该是标题页，只有标题
3. 最后一页应该是总结或感谢页
4. 每页内容要点控制在3-5个
5. 内容要专业、简洁、有逻辑性
6. 使用中文输出`

  const result = streamText({
    model: "anthropic/claude-sonnet-4",
    system: systemPrompt,
    messages,
  })

  return result.toDataStreamResponse()
}
