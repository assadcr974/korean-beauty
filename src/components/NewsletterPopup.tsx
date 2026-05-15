import React, { useState, useEffect } from 'react';

interface NewsletterPopupProps {
  discountCode?: string;
}

export default function NewsletterPopup({ discountCode = 'BIENVENUE10' }: NewsletterPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('kb_newsletter_popup_seen');
    if (!hasSeenPopup) {
      const timer = setTimeout(() => setIsOpen(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('kb_newsletter_popup_seen', 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage('✓ Merci ! Vous recevrez votre code promo par email.');
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        setMessage('Erreur lors de l\'inscription. Réessayez.');
      }
    } catch (error) {
      console.error('Newsletter error:', error);
      setMessage('Erreur. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 text-2xl text-gray-600 hover:text-gray-900"
          aria-label="Fermer"
        >
          ✕
        </button>

        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="mb-6">
            <h2 className="font-display text-3xl text-jade mb-2">Bienvenue chez Korean Beauty</h2>
            <p className="text-lg text-foret font-medium">Inscrivez-vous pour des offres exclusives !</p>
          </div>

          {/* Offer banner */}
          <div className="bg-gradient-to-r from-jade to-menthe rounded-lg p-6 mb-8 text-white">
            <div className="text-center">
              <p className="text-sm uppercase tracking-wider mb-2">Obtenez votre</p>
              <p className="text-5xl font-bold mb-2">-10%</p>
              <p className="text-sm">Sur votre première commande</p>
            </div>
          </div>

          {/* Form */}
          {!message ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  required
                  className="w-full px-4 py-3 rounded border-2 border-jade text-foret placeholder-muted focus:outline-none focus:ring-2 focus:ring-jade"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-jade text-white font-bold py-3 rounded hover:bg-foret transition disabled:opacity-50"
              >
                {isLoading ? 'Inscription...' : 'Obtenir ma réduction'}
              </button>
              <p className="text-xs text-muted text-center">
                Nous respectons votre confidentialité. Désinscription à tout moment.
              </p>
            </form>
          ) : (
            <div className="text-center py-6">
              <p className="text-lg text-jade font-medium">{message}</p>
            </div>
          )}

          {/* Code display */}
          <div className="mt-8 pt-6 border-t border-jade/20">
            <p className="text-xs text-muted text-center mb-2">Code promo :</p>
            <p className="text-center font-bold text-jade text-lg tracking-widest">{discountCode}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
