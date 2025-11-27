# AI Translator App

A real-time AI-powered translation mobile application built with React Native and Expo.

## Features

- **Real-Time Translation**: Instantly translate text between over 70 languages
- **Automatic Language Detection**: Automatically identifies the source language
- **Camera Capture**: Take photos of text and translate them instantly
- **Translation History**: Save and access your previous translations
- **Text-to-Speech**: Listen to the pronunciation of translated text
- **Modern Interface**: Elegant design with smooth animations
- **Cross-Platform Support**: Available for iOS, Android, and Web

## Supported Languages

The app supports translation between over 70 languages, including:

- English, Spanish, French, German, Italian
- Portuguese, Russian, Japanese, Korean, Chinese (Simplified and Traditional)
- Arabic, Hindi, Thai, Vietnamese, Turkish
- And many more...

## Prerequisites

- Node.js (version 18 or higher)
- Bun (installed globally) or npm
- Expo CLI
- For iOS development: macOS with Xcode
- For Android development: Android Studio

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-translator-app-
```

2. Install dependencies:
```bash
bun install
# or
npm install
```

## Running the App

### Development Mode

Start the development server:

```bash
bun run start
```

### Web Development

To run in the browser:

```bash
bun run start-web
```

For advanced web debugging:

```bash
bun run start-web-dev
```

### Mobile App

1. Scan the QR code with the Expo Go app (available on App Store and Google Play)
2. Or run on an emulator:
   - iOS: Press `i` in the terminal
   - Android: Press `a` in the terminal

## Project Structure

```
ai-translator-app-/
├── app/                      # Application routes and screens
│   ├── (tabs)/              # Tab navigation
│   │   ├── translate.tsx    # Main translation screen
│   │   ├── history.tsx      # Translation history
│   │   └── settings.tsx     # App settings
│   ├── camera.tsx           # Camera capture screen
│   ├── language-selector.tsx # Language selector
│   └── index.tsx            # Splash screen
├── assets/                  # Images and icons
├── constants/               # Application constants
│   ├── languages.ts         # List of supported languages
│   └── categories.ts        # Language categories
├── app.json                 # Expo configuration
├── package.json             # Project dependencies
└── tsconfig.json            # TypeScript configuration
```

## Technologies Used

- **React Native** - Mobile development framework
- **Expo** - Development platform and tools
- **TypeScript** - Static typing for JavaScript
- **Expo Router** - File-based navigation
- **React Query** - Server state management
- **Zustand** - Global state management
- **React Native Reanimated** - High-performance animations
- **Lucide React Native** - Icon library
- **NativeWind** - Tailwind CSS for React Native

## Main Features

### Text Translation
- Type or paste text to translate
- Select source and target languages
- Swap languages with a single tap
- Copy results to clipboard

### Camera Translation
- Capture photos of text (menus, signs, documents)
- Automatic text extraction from images
- Instant translation of detected text

### History
- Automatically save all your translations
- Search through previous translations
- Delete old translations

### Settings
- Customize app appearance
- Adjust language preferences
- Manage translation history

## Required Permissions

### iOS
- Camera access
- Microphone access
- Photo library access

### Android
- CAMERA - For capturing images
- RECORD_AUDIO - For voice features
- READ_EXTERNAL_STORAGE - For accessing images
- WRITE_EXTERNAL_STORAGE - For saving images

## Available Scripts

- `bun run start` - Start the development server
- `bun run start-web` - Start in web mode
- `bun run start-web-dev` - Start in web mode with debug
- `bun run lint` - Run the linter

## Contributing

Contributions are welcome. Please:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## License

This project is private and for personal use.

## Support

To report issues or suggest improvements, open an issue in the repository.

---
