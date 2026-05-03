/**
 * Claude Integration for MCP Blog Tools
 * Uses Anthropic Claude API to generate and edit blog content
 */

import Anthropic from "@anthropic-ai/sdk";

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class ClaudeContentGenerator {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: ClaudeConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model || "claude-sonnet-4-5-20250929";
    this.maxTokens = config.maxTokens || 2000;
  }

  /**
   * Generate a blog post from a topic
   */
  async generateBlogPost(params: {
    topic: string;
    style: "formal" | "casual" | "technical" | "conversational";
    targetLength?: number;
    keywords?: string;
  }): Promise<string> {
    const styleGuide = {
      formal: "professional, academic tone with proper citations",
      casual: "friendly, conversational tone, easy to read",
      technical: "detailed technical explanation with code examples",
      conversational: "natural dialogue style, like talking to a friend",
    };

    const prompt = `Write a blog post about "${params.topic}" with the following requirements:
- Tone: ${styleGuide[params.style]}
- Target length: approximately ${params.targetLength || 1500} words
${params.keywords ? `- Include these keywords naturally: ${params.keywords}` : ""}

Start with an engaging introduction, provide substantive content in 3-4 sections, and conclude with actionable takeaways.
Write in Markdown format.`;

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    return textContent.text;
  }

  /**
   * Edit a blog post with specific instructions
   */
  async editBlogPost(params: {
    content: string;
    section?: string;
    instructions: string;
  }): Promise<string> {
    const sectionGuide = {
      title: "the title/heading",
      introduction: "the introduction/opening",
      body: "the main body content",
      conclusion: "the conclusion/closing",
      all: "the entire post",
    };

    const section = params.section || "all";
    const sectionTarget = sectionGuide[section as keyof typeof sectionGuide] || "all";

    const prompt = `Please edit the following blog post. Specifically, modify ${sectionTarget} according to these instructions:

Instructions: ${params.instructions}

Original content:
---
${params.content}
---

Please provide the edited version in Markdown format. Return only the edited content without explanation.`;

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    return textContent.text;
  }

  /**
   * Get improvement suggestions for a blog post
   */
  async suggestImprovements(params: {
    content: string;
    focus?: "clarity" | "engagement" | "seo" | "structure" | "all";
  }): Promise<Array<{ area: string; suggestion: string; priority: "high" | "medium" | "low" }>> {
    const focusGuide = {
      clarity: "clarity and readability",
      engagement: "reader engagement and interest",
      seo: "SEO optimization and keyword usage",
      structure: "logical structure and flow",
      all: "all aspects including clarity, engagement, SEO, and structure",
    };

    const focus = params.focus || "all";
    const focusArea = focusGuide[focus];

    const prompt = `Analyze this blog post and suggest improvements focused on ${focusArea}:

---
${params.content}
---

Provide your suggestions as a JSON array with objects containing:
- "area": The area being improved (e.g., "Introduction", "SEO Keywords")
- "suggestion": The specific improvement to make
- "priority": "high", "medium", or "low"

Return ONLY valid JSON, no other text.`;

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    try {
      return JSON.parse(textContent.text);
    } catch (e) {
      // If JSON parsing fails, return as string suggestions
      return [
        {
          area: "General",
          suggestion: textContent.text,
          priority: "medium",
        },
      ];
    }
  }

  /**
   * Generate SEO metadata for a blog post
   */
  async generateSEOMetadata(params: {
    content: string;
    targetKeywords?: string;
  }): Promise<{
    title: string;
    description: string;
    keywords: string[];
    slug: string;
  }> {
    const prompt = `Analyze this blog post and generate optimal SEO metadata:

---
${params.content}
---

${params.targetKeywords ? `Primary keywords to include: ${params.targetKeywords}` : "Identify the most important keywords"}

Generate and return ONLY a JSON object with:
- "title": SEO-optimized title (50-60 characters)
- "description": Meta description (150-160 characters)
- "keywords": Array of 5-8 relevant keywords
- "slug": URL-friendly slug based on the title

Return ONLY valid JSON, no other text.`;

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    try {
      return JSON.parse(textContent.text);
    } catch (e) {
      // Fallback if parsing fails
      return {
        title: "Blog Post",
        description: "A great blog post",
        keywords: ["blog", "content"],
        slug: "blog-post",
      };
    }
  }
}
