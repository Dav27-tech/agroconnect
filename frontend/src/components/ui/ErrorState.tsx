import React from 'react';
import { Button } from './Button';
import { IconAlert } from './Icons';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Une erreur est survenue',
  message = 'Impossible de charger les données pour le moment. Veuillez vérifier votre connexion.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-red-50/50 rounded-3xl border border-red-200 max-w-lg mx-auto my-8">
      <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mb-4">
        <IconAlert className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-bold text-red-950 mb-2">{title}</h3>
      <p className="text-sm text-red-700/90 max-w-sm mb-6 leading-relaxed">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
