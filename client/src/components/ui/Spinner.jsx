export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10', xl: 'w-16 h-16' };
  return (
    <div className={`${sizes[size]} border-2 border-border border-t-primary rounded-full animate-spin ${className}`} />
  );
}

export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 bg-bg flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-border border-t-primary rounded-full animate-spin" />
        <p className="text-muted text-sm">Cargando...</p>
      </div>
    </div>
  );
}
