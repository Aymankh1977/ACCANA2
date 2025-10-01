# Dental Accreditation Analyzer

A React-based web application for analyzing dental accreditation documents with role-based access control.

## Features

- **Role-Based Access Control**: Different permissions for Admin, University Lead, and University ID roles
- **Document Analysis**: Upload and analyze various document formats (PDF, DOCX, TXT)
- **Interactive Dashboard**: Visual analytics and reporting
- **Responsive Design**: Works on desktop and mobile devices
- **Secure Authentication**: Local storage-based user management

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: CSS with CSS Variables
- **Charts**: Chart.js
- **PDF Processing**: PDF.js
- **Document Processing**: Mammoth (DOCX), jsPDF
- **AI Integration**: Google GenAI

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dental-accreditation-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Default Users

The application comes with pre-configured demo users:

- **Admin**: Username: `admin`, Password: `adminpass`
- **University Lead**: Username: `lead`, Password: `leadpass`

## Building for Production

### Local Build

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Netlify Deployment

### Option 1: Netlify CLI (Recommended)

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Deploy to Netlify:
```bash
npm run deploy
```

### Option 2: Git Integration

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Connect your repository to Netlify:
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "New site from Git"
   - Select your repository
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `dist`
3. Deploy automatically on push

### Option 3: Manual Deploy

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist` folder:
```bash
netlify deploy --prod --dir=dist
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory for local development:

```env
VITE_GOOGLE_API_KEY=your_google_api_key_here
VITE_APP_TITLE=Dental Accreditation Analyzer
```

### Netlify Configuration

The `netlify.toml` file contains all necessary configuration for Netlify deployment:

- Build command and publish directory
- Environment variables
- Redirect rules for SPA routing
- Security headers
- Performance optimizations

## Project Structure

```
dental-accreditation-analyzer/
├── public/                 # Static assets
├── src/
│   ├── components/         # React components
│   ├── App.tsx            # Main application component
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles
├── dist/                  # Production build output
├── netlify.toml           # Netlify configuration
├── _redirects             # SPA redirect rules
├── vite.config.js         # Vite build configuration
├── package.json           # Dependencies and scripts
└── README.md              # Documentation
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy to Netlify
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Security Features

- Content Security Policy (CSP) headers
- XSS protection
- Frame protection
- Secure redirects for SPA routing

## Performance Optimizations

- Code splitting with manual chunks
- Minified production builds
- Optimized asset loading
- Compression enabled

## Troubleshooting

### Build Issues

1. **Node.js version**: Ensure you're using Node.js 18+
2. **Dependencies**: Run `npm install` to ensure all dependencies are installed
3. **Clear cache**: Try `npm run build -- --force` to clear Vite cache

### Deployment Issues

1. **Build command**: Verify `npm run build` works locally
2. **Publish directory**: Ensure `dist` directory exists after build
3. **Environment variables**: Check if all required env vars are set in Netlify dashboard

### Runtime Issues

1. **Local storage**: Clear local storage if experiencing authentication issues
2. **Browser cache**: Hard refresh (Ctrl+F5) to clear cached assets
3. **Console errors**: Check browser console for error messages

## License

Apache License 2.0 - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review browser console for errors
3. Verify all environment variables are configured
4. Ensure Node.js and npm versions meet requirements