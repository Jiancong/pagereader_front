import PptxGenJS from "pptxgenjs"

interface Slide {
  title: string
  content: string[]
}

export async function POST(req: Request) {
  const { slides } = (await req.json()) as { slides: Slide[] }

  if (!slides || !Array.isArray(slides)) {
    return Response.json({ error: "Invalid slides data" }, { status: 400 })
  }

  // Create presentation
  const pptx = new PptxGenJS()
  pptx.author = "SlideAI"
  pptx.title = slides[0]?.title || "Presentation"
  pptx.subject = "AI Generated Presentation"

  // Define theme colors
  const primaryColor = "00B4A6" // Teal/cyan color
  const textColor = "1A1A2E"
  const mutedColor = "6B7280"

  slides.forEach((slide, index) => {
    const pptSlide = pptx.addSlide()

    if (index === 0) {
      // Title slide
      pptSlide.addText(slide.title, {
        x: 0.5,
        y: 2.5,
        w: 9,
        h: 1.5,
        fontSize: 44,
        bold: true,
        color: textColor,
        align: "center",
        fontFace: "Microsoft YaHei",
      })

      if (slide.content.length > 0) {
        pptSlide.addText(slide.content[0], {
          x: 0.5,
          y: 4,
          w: 9,
          h: 0.5,
          fontSize: 20,
          color: mutedColor,
          align: "center",
          fontFace: "Microsoft YaHei",
        })
      }

      // Add accent line
      pptSlide.addShape("rect" as PptxGenJS.ShapeType, {
        x: 3.5,
        y: 3.8,
        w: 3,
        h: 0.05,
        fill: { color: primaryColor },
      })
    } else if (index === slides.length - 1) {
      // Closing slide
      pptSlide.addText(slide.title, {
        x: 0.5,
        y: 2.5,
        w: 9,
        h: 1.5,
        fontSize: 40,
        bold: true,
        color: textColor,
        align: "center",
        fontFace: "Microsoft YaHei",
      })

      if (slide.content.length > 0) {
        pptSlide.addText(slide.content.join("\n"), {
          x: 0.5,
          y: 4,
          w: 9,
          h: 1,
          fontSize: 18,
          color: mutedColor,
          align: "center",
          fontFace: "Microsoft YaHei",
          lineSpacing: 28,
        })
      }
    } else {
      // Content slide
      pptSlide.addText(slide.title, {
        x: 0.5,
        y: 0.4,
        w: 9,
        h: 0.8,
        fontSize: 32,
        bold: true,
        color: textColor,
        fontFace: "Microsoft YaHei",
      })

      // Accent line under title
      pptSlide.addShape("rect" as PptxGenJS.ShapeType, {
        x: 0.5,
        y: 1.2,
        w: 1.5,
        h: 0.04,
        fill: { color: primaryColor },
      })

      // Content bullets
      const bulletPoints = slide.content.map((item) => ({
        text: item,
        options: {
          fontSize: 18,
          color: textColor,
          bullet: { type: "bullet" as const, color: primaryColor },
          indentLevel: 0,
        },
      }))

      pptSlide.addText(bulletPoints, {
        x: 0.5,
        y: 1.6,
        w: 9,
        h: 4,
        fontFace: "Microsoft YaHei",
        lineSpacing: 36,
        valign: "top",
      })
    }

    // Add slide number (except first slide)
    if (index > 0) {
      pptSlide.addText(`${index + 1}`, {
        x: 9,
        y: 5.2,
        w: 0.5,
        h: 0.3,
        fontSize: 10,
        color: mutedColor,
        align: "right",
      })
    }
  })

  // Generate PPTX buffer
  const pptxBuffer = await pptx.write({ outputType: "arraybuffer" })

  return new Response(pptxBuffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": "attachment; filename=presentation.pptx",
    },
  })
}
