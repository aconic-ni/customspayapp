"use client";

import React, { useState, useEffect } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { SolicitudDocument } from '@/components/pdf/SolicitudDocument';
import { Button } from '@/components/ui/button';
import { FileType } from 'lucide-react';
import type { ExamData, SolicitudData } from '@/types';
import { cn } from '@/lib/utils';

interface ClientPDFDownloadProps {
  examData: ExamData | null;
  solicitudes: SolicitudData[] | null;
  className?: string;
}

export const ClientPDFDownload: React.FC<ClientPDFDownloadProps> = ({ examData, solicitudes, className }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Simplified condition for testing: only check if mounted.
  // Later, we will re-add !examData || !solicitudes || solicitudes.length === 0 checks
  if (!isMounted) {
    return (
      <Button variant="outline" className={cn("hover:bg-accent/50 w-full sm:w-auto", className)} disabled>
        <FileType className="mr-2 h-4 w-4" /> Cargando PDF...
      </Button>
    );
  }
  
  // For testing, ensure examData and solicitudes are not strictly required IF the SolicitudDocument is also simplified
  // We'll use placeholder data if they are null, but for the current test, SolicitudDocument doesn't use them.
  const safeExamData = examData || { ne: 'TEST_NE', reference: '', manager: '', date: new Date(), recipient: '' };
  const safeSolicitudes = solicitudes && solicitudes.length > 0 ? solicitudes : [{id: 'test-sol', monto: 0}];


  const fileName = `SolicitudCheque_${safeExamData.ne || 'TEST_NE'}_${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadLink
      // Pass safe data, though the simplified SolicitudDocument won't use it
      document={<SolicitudDocument /*examData={safeExamData} solicitudes={safeSolicitudes}*/ />}
      fileName={fileName}
      className={className}
    >
      {({ loading, error, url, blob }) => {
        if (error) {
          console.error("Error generating PDF link (raw):", error);
          if (error instanceof Error) {
            console.error("Error message:", error.message);
            if (error.stack) {
              console.error("Error stack:", error.stack);
            }
          } else if (typeof error === 'object' && error !== null) {
            Object.keys(error).forEach(key => {
              console.error(`Error object property - ${key}:`, (error as any)[key]);
            });
          }
          return (
            <Button variant="outline" className={cn("hover:bg-destructive/50 w-full sm:w-auto text-destructive", className)} disabled>
              <FileType className="mr-2 h-4 w-4" /> Error PDF
            </Button>
          );
        }
        return (
          <Button variant="outline" className={cn("hover:bg-accent/50 w-full sm:w-auto", className)} disabled={loading}>
            <FileType className="mr-2 h-4 w-4" /> {loading ? 'Generando PDF...' : 'Descargar PDF'}
          </Button>
        );
      }}
    </PDFDownloadLink>
  );
};