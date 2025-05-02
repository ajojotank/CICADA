# 🦋 CICADA

> A modern constitutional archive search and management system

CICADA is a full-stack web application that makes exploring historical constitutional archives a breeze. Built with React, Supabase, and modern web technologies, it combines powerful AI-driven search capabilities with an intuitive user interface.

## ✨ Features

- 🔐 **Secure Authentication** - OAuth integration with Google, Facebook, and GitHub via Supabase
- 📂 **Smart Document Management** - Structured directory system for organizing archival content
- 🤖 **AI-Powered Search** - Natural language queries powered by RAG (Retrieval Augmented Generation)
- 🎯 **Metadata Management** - Rich document tagging and metadata editing capabilities
- 📱 **Modern UI/UX** - Beautiful, responsive interface built with shadcn and Tailwind CSS
- 📊 **Admin Dashboard** - Comprehensive analytics and document management interface
- 🔍 **Insight Modal** - AI-extracted insights with source document references
- 🌐 **Public Search Interface** - User-friendly search with history and saved queries

## 🚀 Quick Start

### Prerequisites

- Node.js 16.x or later
- A Supabase account (local or cloud)
- OAuth provider credentials (Google, Facebook, GitHub)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cicada-inquiry-assist.git
   cd cicada-inquiry-assist
   ```

2. **Environment Setup**
   - Copy `.env.example` to `.env`
   - Update with your Supabase credentials:
     ```
     VITE_SUPABASE_URL=your_supabase_url
     VITE_SUPABASE_ANON_KEY=your_anon_key
     ```

3. **Supabase Configuration**
   - Deploy edge functions from `supabase/functions/`
   - Run database seeds from `supabase/seed/`
   - Enable OAuth providers in Supabase Studio

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

### Production Build

```bash
npm run build
```
The built application will be in the `dist` folder, ready for deployment to any static hosting provider.

## 🏗️ Tech Stack

- **Frontend**: React + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase
- **Authentication**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **AI Integration**: RAG-based search system
- **CI/CD**: GitHub Actions & Azure Pipelines

## 👥 Contributors

- Joash Paul
- Emmanuel Azubuike
- Calvin Rea
- Kamogelo Khumalo

## 🤝 Contributing

We welcome contributions! Feel free to submit issues and pull requests.

## 📝 License

This is an open source project. [License details to be added]

---

<p align="center">Made with ❤️ for COMS3009A Software Design (Wits)</p>