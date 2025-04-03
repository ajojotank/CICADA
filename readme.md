# 🐞 CICADA: Constitutional Inquiry and Compliance Archival Data Assistant

CICADA is a full-stack web application designed to manage and query historical constitutional archive data. It allows admins to upload and organize archival documents in structured directories with metadata, and enables public users to perform natural language queries over the data.

> **Developed for:** Software Design Course (COMS3009A)  
> **Language:** JavaScript (React.js + Node.js)  
> **Deployment:** AWS  
> **Search Engine:** MeiliSearch  
> **Auth:** Firebase/Auth0  

---

## 📁 Repository Contents

| File/Folder                 | Description                                                                 |
|----------------------------|-----------------------------------------------------------------------------|
| `Architecture-Diagram.png` | High-level system architecture diagram showing orchestration of components. |
| `CICADA - User Focus.pdf`  | PDF document with user stories, UI descriptions, and screen overviews.       |
| `Project-Brief.pdf`        | Official brief outlining project requirements and deliverables.              |

---

## 🔧 Tech Stack

| Layer             | Technology                      |
|------------------|----------------------------------|
| Frontend         | React.js + Vite, Tailwind CSS    |
| Backend          | Node.js + Express.js             |
| Database         | PostgreSQL                       |
| Search Engine    | MeiliSearch                      |
| Authentication   | Firebase Auth / Auth0            |
| Storage          | AWS S3                           |
| CI/CD            | GitHub Actions or AWS CodePipeline |
| Deployment       | AWS Amplify / AWS ECS / EC2      |

---

## 📌 Features Overview

- ✅ Secure Admin Authentication
- 📂 Admin Uploads & Directory Management
- 🏷️ Metadata Editing & Tagging
- 🔍 Public Natural Language Search Interface
- 🔌 REST API (Extensible to WhatsApp bots)
- 🚀 Full AWS Deployment with CI/CD

---

## 📅 Development Plan

The project follows an **Agile methodology** with test-driven development and continuous integration. Key milestones include:

1. **Authentication Setup**
2. **Admin Portal (Upload + Metadata)**
3. **Search Interface & Engine**
4. **RESTful API Development**
5. **CI/CD & AWS Deployment**
6. **Bonus: NLP-enhanced Search, Multilingual Support**

---

## 📜 License

This project is licensed for academic use as part of the Wits University Software Design (COMS3009A) course. All rights reserved to contributors.

---

## 🤝 Contributors

- **Joash Paul**
- **Emmanuel Azu**
- **Calvin Rea**
- **Kamogelo Khumalo**

---

## 🧠 Acknowledgments

Thanks to the Software Design course instructors and Wits University for the opportunity to build CICADA. Special inspiration from platforms like *Access to Memory*, *Perplexity AI*, and open-source civic tech tools.

---
