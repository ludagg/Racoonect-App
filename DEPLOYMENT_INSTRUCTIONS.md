# Racoonect Web Build - Deployment Instructions

## Build Information

**Build Date:** March 15, 2025  
**Archive File:** `racoonect-web-build.tar.gz` (2.1 MB)  
**Build Location:** `/home/engine/project/racoonect-web-build.tar.gz`

## Build Summary

The web build has been successfully generated for the Racoonect application. The build includes:

- **Total Routes:** 17 static HTML pages
- **Main JavaScript Bundle:** 2.13 MB (optimized)
- **Routes Generated:**
  - Home page (`index.html`)
  - Login pages (`login.html`, `(auth)/login.html`)
  - Explore page (`explore.html`, `(tabs)/explore.html`)
  - User type pages:
    - Agriculteur (farmer)
    - Chauffeur (driver)
    - Fournisseur (supplier)
    - Gestionnaire (manager)
  - Modal and sitemap pages
  - 404 not-found page

## Changes Made

### Fixed `lib/supabase.ts`

The Supabase client configuration was updated to support static web export by:

1. **Added Platform Detection:** Detects if running in a browser environment vs. native platforms
2. **localStorage Support:** Uses `localStorage` for web browsers when available
3. **SSR Compatibility:** Gracefully handles Server-Side Rendering (SSR) during static export by returning null when localStorage is unavailable
4. **Native Platform Support:** Maintains `expo-secure-store` usage for iOS and Android

The key changes:
- Check for `typeof window !== 'undefined'` and `typeof localStorage !== 'undefined'` to detect browser environment
- Return `Promise.resolve(null)` during SSR instead of accessing localStorage
- Ensures static export works without errors while preserving browser functionality

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Extract the archive:**
   ```bash
   tar -xzf racoonect-web-build.tar.gz
   ```

2. **Deploy with Vercel CLI:**
   ```bash
   npx vercel deploy --prod dist/
   ```

3. **Or via Vercel Dashboard:**
   - Create a new project on [vercel.com](https://vercel.com)
   - Drag and drop the `dist/` folder or connect your Git repository
   - Set the output directory to `dist` (if using Git)
   - Deploy!

**Configuration file (vercel.json):**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### Option 2: Netlify

1. **Extract the archive:**
   ```bash
   tar -xzf racoonect-web-build.tar.gz
   ```

2. **Deploy with Netlify CLI:**
   ```bash
   npx netlify deploy --prod --dir=dist
   ```

3. **Or via Netlify Dashboard:**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Click "Add new site" → "Deploy manually"
   - Drag and drop the `dist/` folder
   - Your site will be live in seconds!

### Option 3: GitHub Pages

1. **Extract the archive:**
   ```bash
   tar -xzf racoonect-web-build.tar.gz
   ```

2. **Create a gh-pages branch:**
   ```bash
   git checkout --orphan gh-pages
   git rm -rf .
   cp -r dist/* .
   git add .
   git commit -m "Deploy to GitHub Pages"
   git push origin gh-pages
   ```

3. **Enable GitHub Pages:**
   - Go to your repository Settings → Pages
   - Select `gh-pages` branch as the source
   - Your site will be available at `https://yourusername.github.io/repository-name`

### Option 4: Cloudflare Pages

1. **Extract the archive:**
   ```bash
   tar -xzf racoonect-web-build.tar.gz
   ```

2. **Deploy with Wrangler CLI:**
   ```bash
   npx wrangler pages deploy dist/
   ```

3. **Or via Cloudflare Dashboard:**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com)
   - Create a new Pages project
   - Upload the `dist/` folder
   - Deploy!

### Option 5: AWS S3 + CloudFront

1. **Extract the archive:**
   ```bash
   tar -xzf racoonect-web-build.tar.gz
   ```

2. **Upload to S3:**
   ```bash
   aws s3 sync dist/ s3://your-bucket-name --delete
   ```

3. **Configure CloudFront:**
   - Create a CloudFront distribution pointing to your S3 bucket
   - Set default root object to `index.html`
   - Enable static website hosting on S3 bucket

### Option 6: Traditional Web Hosting

For Apache/Nginx or shared hosting:

1. **Extract the archive:**
   ```bash
   tar -xzf racoonect-web-build.tar.gz
   ```

2. **Upload files:**
   - Upload the contents of the `dist/` folder to your web server's public directory (usually `public_html` or `www`)

3. **Configure server (if needed):**
   
   **Apache (.htaccess):**
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

   **Nginx:**
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

## Post-Deployment Checklist

- [ ] Verify all pages load correctly
- [ ] Test navigation between routes
- [ ] Check that authentication flow works (requires Supabase configuration)
- [ ] Verify responsive design on mobile and desktop
- [ ] Test dark/light mode toggle (if applicable)
- [ ] Ensure assets (images, fonts) load correctly
- [ ] Check browser console for any errors
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)

## Notes

### Supabase Authentication

The application uses Supabase for authentication. For authentication to work in production:

1. **Add your Supabase URL and Anon Key** to environment variables on your hosting platform:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **Update Supabase project settings:**
   - Add your production domain to Supabase Authentication → Site URL
   - Configure redirect URLs for OAuth providers

### Static Site Limitations

Since this is a static export:
- Server-side features are not available
- All authentication happens on the client side
- Dynamic routes are pre-rendered at build time
- No API routes or server-side logic

### Performance

The build is optimized with:
- Code splitting (main bundle: 2.13 MB)
- Static HTML generation for all routes
- Pre-rendered content for better SEO
- Lazy loading for dynamic imports

## Support

For issues or questions:
- Review Expo Router documentation: https://docs.expo.dev/router/
- Check Supabase React Native docs: https://supabase.com/docs/guides/auth/react-native
- Examine the codebase in `/home/engine/project`
