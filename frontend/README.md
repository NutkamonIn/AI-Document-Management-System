# AI Document Management System (AI Doc Hub - Frontend & RAG Service)

An enterprise-grade, multi-modal Retrieval-Augmented Generation (RAG) document intelligence platform built with Next.js 15 App Router, TypeScript, Neon Cloud PostgreSQL, pgvector, Sharp Image Engine, and Groq Cloud LLM acceleration.

---

## System Overview

AI Document Management System transforms complex, multi-page Thai and multi-lingual PDF documents into an interactive, high-precision knowledge store. The platform combines vector similarity search with automated PDF XObject image extraction, delivering dynamic multi-modal context responses accompanied by exact page-level citations and embedded document figure previews.

### Core Capabilities:
- **Precision Page-Level Citations**: Every AI response cites authoritative source document names and exact page numbers.
- **Automated PDF Image Extraction**: Scans XObject and Form XObject trees to extract embedded images (DCTDecode, FlateDecode) and converts them into standardized PNG files via Sharp.
- **In-App Floating Image Lightbox**: Interactive modal viewer allowing users to expand image figures in place with keyboard ESC support, click-outside dismissal, and dedicated close control.
- **Automated Mermaid Flowchart Generation**: Converts procedural document workflows into visual Mermaid diagrams automatically within chat responses.
- **Ultrawide Monitor Support (`max-w-[2560px]`)**: Fluid responsive dashboard and chat interfaces tailored for multi-column ultra-high-resolution displays up to 2560px width.
- **Zero Local Storage Security Model**: Processes PDF buffers entirely in-memory and stores encrypted binary payload records on Neon Cloud PostgreSQL without leaving transient files on disk.

---

## Key Features

### 1. Document Processing & Multi-Modal RAG Pipeline
- In-memory PDF parsing and chunking with 1536-dimensional vector embedding generation.
- Recursive XObject image extraction supporting FlateDecode zlib stream decompression and Sharp PNG encoding.
- Real-time document list synchronization with 2-second background polling without manual page refresh.

### 2. Intelligent AI Chat & Citation Engine
- Contextual question-answering with strict grounding to uploaded PDF context.
- Automatic image tag injection referencing extracted figures from matching document pages.
- Resilient model execution with automatic model fallback to `groq/compound` upon upstream provider status errors.

### 3. Rich Markdown & Interactive Visualizations
- Complete Markdown rendering including headers, tables, code blocks, lists, and blockquotes.
- Floating image lightbox overlay supporting multi-modal document figure inspection.
- Automated Mermaid flowchart parsing and SVG rendering for document procedures.

### 4. Quota Tracking & Capacity Monitoring
- Real-time capacity meters with high-precision decimal percentage display.
- Automatic daily quota reset at 07:00 AM ICT (00:00 UTC).
- Synchronization with Groq Cloud Console dashboard usage baselines.

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling & UI** | Tailwind CSS, Lucide React Icons, Custom Tailwind Plugins |
| **Authentication** | NextAuth.js (Auth.js v5) |
| **Database & Vector** | Neon Cloud PostgreSQL, Prisma ORM, pgvector Extension |
| **AI Providers** | Groq Cloud API (`groq/compound`), Google Gemini 1.5, Ollama |
| **Image Engine** | Sharp, Zlib, pdf-lib, pdf-parse |
| **Diagram Engine** | Mermaid.js 11 |

---

## Environment Variables Configuration

Create a `.env` or `.env.local` file inside the `frontend/` directory:

```env
# PostgreSQL Connection String (Neon Cloud with pgvector)
DATABASE_URL="postgresql://neondb_owner:npg_pbTU5ECG8jva@ep-wispy-star-ay6klfbi-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# NextAuth Authentication Configuration
NEXTAUTH_SECRET="your-nextauth-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI Provider Credentials
GROQ_API_KEY="your-groq-api-key-here"
GEMINI_API_KEY=""

# Local Ollama Settings (Optional)
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_CHAT_MODEL="llama3.2"
```

---

## Installation & Setup Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Synchronize Prisma Database Schema
```bash
npx prisma db push
npx prisma generate
```

### 3. Run Development Server
```bash
npm run dev
```

Access the application in your browser at: `http://localhost:3000`

---

## System Governance & Compliance Directives

1. **Strict No-Emoji Enforcement**: The codebase, UI strings, and AI prompts adhere strictly to a zero-emoji policy for professional enterprise aesthetic consistency.
2. **Zero Local Disk Retention**: Uploaded PDF buffers and extracted image artifacts are processed exclusively in volatile memory and stored in Neon Cloud PostgreSQL.
3. **Automated Daily Reset**: AI API token and request quotas reset automatically at 07:00 AM ICT (00:00 UTC) every 24 hours.

---

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.


