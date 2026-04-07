# Meridix Labs

> Your health, clearly explained.

AI-powered medical lab result interpretation — upload a PDF or photo, get instant clarity at three levels of depth.

## Getting Started

### 1. Install Node.js

Node.js is required to run this project. Install it from https://nodejs.org (LTS version recommended), or via Homebrew:

```bash
brew install node
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure your API key

Copy the example env file and add your Anthropic API key:

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` and replace `your_anthropic_api_key_here` with your key from https://console.anthropic.com.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout (nav + footer)
│   ├── page.tsx            # Landing page
│   ├── globals.css         # Global styles + Tailwind
│   ├── about/
│   │   └── page.tsx        # About page
│   ├── app/
│   │   └── page.tsx        # Upload + results interface
│   └── api/
│       └── analyze/
│           └── route.ts    # Claude API integration
└── components/
    ├── Navigation.tsx      # Fixed top nav
    └── Footer.tsx          # Footer with disclaimer
```

## Pages

| Route   | Description                                    |
|---------|------------------------------------------------|
| `/`     | Landing page — hero, how it works, features    |
| `/app`  | Upload interface + 3-tier AI interpretation    |
| `/about`| Company mission and values                     |

## How it works

1. User uploads a lab result (PDF or image) on `/app`
2. The file is sent to `/api/analyze` as `multipart/form-data`
3. The API route sends it to Claude with a carefully crafted system prompt
4. Claude returns a structured JSON with `simple`, `medium`, `expert`, and `action` fields
5. The UI displays the interpretation with a tab toggle and flagged values

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude (`claude-sonnet-4-0`)
- **Language**: TypeScript

## Disclaimer

Meridix Labs is an educational tool. It is not a medical device and does not provide diagnoses. Always consult a qualified physician.
