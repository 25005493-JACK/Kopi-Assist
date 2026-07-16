import './globals.css';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/i18nContext';

export const metadata = {
  title: 'Kopi Assist - Financial Management Platform',
  description: 'AI-powered financial management for small and medium enterprises',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
