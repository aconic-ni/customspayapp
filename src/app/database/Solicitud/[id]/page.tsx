// This is the new Server Component page.tsx
import ClientPage from './ClientPage';
import type { Metadata } from 'next';

// If you need to set metadata for these dynamic pages, you can do it here
// export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
//   return {
//     title: `Detalle Solicitud ${params.id} - ACONIC FAL`,
//   };
// }

// Required for static export of dynamic routes
export async function generateStaticParams() {
  // Return an empty array if you don't want to pre-render any specific paths.
  // Next.js will generate a fallback for client-side rendering.
  // Or, you could fetch a list of known/common IDs here if desired.
  return [];
}

export default function SolicitudDatabaseDetailPage({ params }: { params: { id: string } }) {
  return <ClientPage id={params.id} />;
}
