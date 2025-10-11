# AI Blog Generator Plugin

Automatically generates blog drafts using multiple AI providers (OpenAI, Grok, or Gemini) with configurable topics, custom prompts, and scheduling through the Next-Blog cron system.

## Features

- **Multiple AI Providers**: Support for OpenAI GPT-4, Grok (xAI), and Google Gemini
- **Self-Contained Configuration**: All API keys and settings managed within the plugin
- **Custom Prompt Templates**: Edit and customize the AI generation prompts
- **Configurable Topics**: Manage a list of topics for content generation
- **Smart Scheduling**: Distributes blog generation evenly throughout the day using 5-minute cron intervals
- **Daily Limits**: Configure how many blogs to generate per day (1-10)
- **Dashboard Integration**: Full settings panel for easy configuration
- **Status Monitoring**: Real-time status overview and generation tracking
- **Recent Blogs Display**: View last 10 generated blogs with AI provider information

## Requirements

1. **AI Provider API Key**: At least one of:
   - OpenAI API key (for GPT-4)
   - Grok API key (for xAI's Grok)
   - Google Gemini API key
2. **Cron System**: The Next-Blog cron system must be active

## Installation

1. Install the plugin through the Next-Blog dashboard:
   ```
   Plugin URL: http://localhost:3248/plugins/ai-blog-generator/plugin.js
   ```

2. Configure the plugin through the settings panel (all settings are managed within the plugin)

## Configuration

All configuration is done through the plugin's settings panel - no global settings required!

### AI Provider Selection

Choose your preferred AI provider:

- **OpenAI (GPT-4)**: High-quality content generation
- **Grok (xAI)**: Conversational AI with unique perspective
- **Google Gemini**: Google's latest AI model

### API Key Configuration

Configure API keys directly in the plugin settings panel:

- **OpenAI API Key**: Your OpenAI API key (sk-...)
- **Grok API Key**: Your xAI API key (xai-...)
- **Gemini API Key**: Your Google AI API key (AIza...)

### Content Configuration

- **Daily Limit**: Number of blogs to generate per day (1-10)
- **Topics**: List of topics for content generation
- **Custom Prompt**: Fully customizable prompt template with {topic} placeholder
- **Generation Status**: Monitor blogs created today and last generation time

## How It Works

1. **Cron Trigger**: Every 5 minutes, the cron hook checks if a blog should be generated
2. **Smart Timing**: Generation is distributed evenly throughout the day based on daily limit
3. **Topic Selection**: A random topic is selected from your configured topics
4. **Content Generation**: Selected AI provider creates comprehensive blog content (800-1500 words)
5. **Draft Creation**: Blog is saved as a draft with proper metadata

## Generated Content Structure

Each generated blog includes:

- **Title**: Engaging, SEO-friendly title (60-80 characters)
- **Excerpt**: Brief summary (150-200 words)
- **Content**: Full article with proper structure and markdown formatting
- **Status**: **Always saved as DRAFT** for manual review before publishing
- **Plugin Metadata**: Comprehensive metadata for tracking and identification

### Plugin Metadata Tags

Every generated blog includes these metadata fields:

```json
{
  "generatedBy": "ai-blog-generator",
  "generatedByPlugin": "AI Blog Generator",
  "aiProvider": "openai|grok|gemini",
  "aiProviderName": "OpenAI|Grok|Gemini",
  "pluginVersion": "1.0.0",
  "topic": "Selected topic",
  "generatedAt": timestamp,
  "generationMethod": "ai-automated",
  "aiGenerated": true,
  "requiresReview": true
}
```

These tags make it easy to:
- Identify AI-generated content
- Track which plugin and AI provider created the content
- Filter and manage automated content
- Ensure proper review workflow
- Identify content source for analytics

## Usage

### Initial Setup

1. Choose your preferred AI provider (OpenAI, Grok, or Gemini)
2. Configure the corresponding API key in the plugin settings
3. Add topics you want to generate content about
4. Set your desired daily blog limit
5. (Optional) Customize the prompt template
6. The plugin will automatically start generating blogs

### Managing Topics

- **Add Topics**: Enter diverse topics for better content variety
- **Remove Topics**: Click the ✕ button next to any topic
- **Topic Selection**: Topics are randomly selected for each generation

### Monitoring

The status overview shows:

- **API Key Status**: Whether the Gemini API key is configured
- **Generation Count**: How many blogs were created today
- **Remaining Count**: How many more blogs can be generated today
- **Last Generated**: When the last blog was created

### Custom Prompt Templates

Edit the AI generation prompt to match your needs:

- **Placeholder Support**: Use `{topic}` as a placeholder for the selected topic
- **Full Customization**: Control the AI's output style, length, and format
- **Reset Option**: Easily revert to the default prompt
- **Live Preview**: See exactly what prompt will be sent to the AI

### Recent Generated Blogs

The plugin interface displays:

- **Recent Blogs List**: Last 10 generated blogs with status indicators
- **AI Provider Information**: Shows which AI provider generated each blog
- **Draft Status Badges**: Clear visual indicators for blog status
- **AI Generated Badges**: Purple badges marking AI-generated content
- **Metadata Information**: Creation date, topic, slug, and AI provider for each blog
- **Plugin Metadata Display**: Shows the tracking tags applied to each blog

All generated blogs are clearly marked with:
- 🤖 **AI Generated** badge
- **Draft** status (yellow badge)
- **AI Provider** identifier
- Plugin metadata for tracking

## Technical Details

### Cron Schedule

- **Frequency**: Every 5 minutes (`cron:5-minute` hook)
- **Distribution**: Blogs are evenly spaced throughout the day
- **Example**: For 2 blogs/day, generation occurs every 12 hours

### Content Format

Generated content uses the Next-Blog ContentObject format:

```typescript
{
  version: 1,
  content: [
    {
      name: 'Paragraph',
      version: 1,
      data: [/* Text content */]
    }
  ]
}
```

### Permissions

The plugin requires these permissions:

- `blogs:read` - To read existing blogs
- `blogs:write` - To create new blog drafts
- `settings:read` - To read plugin and global settings
- `settings:write` - To update plugin settings

## Error Handling

The plugin includes comprehensive error handling:

- **API Key Missing**: Warning displayed in settings panel
- **Gemini API Errors**: Logged with detailed error messages
- **Content Generation Failures**: Graceful fallback with error logging
- **Rate Limiting**: Respects daily limits and time-based distribution

## Development

### Building

```bash
cd plugins/gemini-blog-generator
bun run build
```

### Development Mode

```bash
bun run dev
```

### Type Checking

```bash
bun run typecheck
```

## Contributing

When contributing to this plugin:

1. Follow the established code patterns
2. Maintain proper TypeScript types
3. Test with various topic configurations
4. Ensure error handling is comprehensive
5. Update documentation for new features

## Support

For issues or questions:

1. Check the plugin logs in the dashboard
2. Verify your Gemini API key is valid
3. Ensure topics are configured
4. Review the cron system status

## License

This plugin is part of the Next-Blog ecosystem and follows the same licensing terms.