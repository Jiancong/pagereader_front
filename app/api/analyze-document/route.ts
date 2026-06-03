import { generateText } from "ai"

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get("file") as File

  if (!file) {
    return Response.json({ error: "No file uploaded" }, { status: 400 })
  }

  // Read file content
  const text = await file.text()
  const truncatedText = text.slice(0, 15000) // Limit to 15k chars for API

  const systemPrompt = `你是一个专业的演示文稿设计专家。用户会给你一段文档内容，你需要分析它并生成一个结构化的PPT大纲。

请严格按照以下JSON格式输出，不要有任何其他文字：

[
  {
    "title": "幻灯片标题",
    "content": ["要点1", "要点2", "要点3"]
  }
]

要求：
1. 分析文档的核心内容和结构
2. 生成8-12页幻灯片
3. 第一页应该是标题页
4. 最后一页应该是总结或要点回顾
5. 每页内容要点控制在3-5个
6. 提取文档中的关键信息和数据
7. 使用中文输出`

  try {
    const { text: responseText } = await generateText({
      model: "anthropic/claude-sonnet-4",
      system: systemPrompt,
      prompt: `请分析以下文档内容并生成PPT大纲：\n\n${truncatedText}`,
    })

    // Parse the JSON response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const slides = JSON.parse(jsonMatch[0])
      return Response.json({ slides })
    }

    return Response.json({ error: "Failed to parse response" }, { status: 500 })
  } catch (error) {
    console.error("[v0] Error analyzing document:", error)
    return Response.json({ error: "Failed to analyze document" }, { status: 500 })
  }
}
