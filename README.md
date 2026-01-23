# AnkiSnap

AnkiSnap is an AI-powered desktop application designed to streamline the creation of Anki cards from images. Whether it's a photo of a textbook page, a screenshot of a video, or any other visual material, AnkiSnap uses multimodal Large Language Models (LLMs) to analyze the content and generate high-quality study cards with audio.

## 🚀 Features

- **AI Image-to-Card**: Transform visual content into structured Anki cards (English/Chinese/Grammar) using models like OpenAI GPT-4o or Aliyun DashScope (Qwen-VL).
- **Multimodal Support**: Seamlessly processes images and extracts linguistic information, examples, and grammatical explanations.
- **Integrated TTS**: Enhance your cards with high-quality audio using multiple providers:
  - **OpenAI TTS**
  - **Azure Cognitive Services**
  - **Volcengine (ByteDance)**
- **One-Click Sync**: Directly add cards to your local Anki collections via AnkiConnect.
- **Built with Modern Tech**: Powered by Electron, React, Vite, and Tailwind CSS.

## 🛠️ Prerequisites

- **Anki**: Must be installed and running.
- **AnkiConnect**: The Anki add-on (ID: 2055492159) must be installed and configured to allow connections.
- **API Keys**: You will need API keys for the LLM and TTS providers you wish to use (OpenAI, Aliyun, Azure, or Volcengine).

## 📦 Installation & Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/changyoung/AnkiSnap.git
   cd AnkiSnap
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development mode**:
   ```bash
   npm run dev
   ```

## 🏗️ Building

To package the application for production (currently configured for a portable Windows build):

```bash
npm run dist
```

The output will be located in the `dist-release` directory.

## ⚙️ Configuration

1. Open AnkiSnap and navigate to the **Settings** page.
2. Configure your **LLM Provider** (OpenAI-compatible or DashScope).
3. Configure your **TTS Provider** for audio generation.
4. Set your **Anki Connection** settings (ensure AnkiConnect is active).

## 📄 License

Private.

---
Developed with ❤️ by AI
