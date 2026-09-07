const variants = {
  default:  'bg-border text-muted',
  primary:  'bg-primary/20 text-primary border border-primary/30',
  success:  'bg-green/20 text-green border border-green/30',
  warning:  'bg-gold/20 text-gold border border-gold/30',
  danger:   'bg-rose/20 text-rose border border-rose/30',
  cyan:     'bg-cyan/20 text-cyan border border-cyan/30',
};

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`badge ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    pending:    { label: 'Pendiente',   variant: 'warning' },
    approved:   { label: 'Aprobado',    variant: 'success' },
    rejected:   { label: 'Rechazado',   variant: 'danger'  },
    processing: { label: 'Procesando',  variant: 'cyan'    },
    completed:  { label: 'Completado',  variant: 'success' },
    reversed:   { label: 'Revertido',   variant: 'warning' },
    expired:    { label: 'Expirado',    variant: 'default' },
  };
  const { label, variant } = map[status] || { label: status, variant: 'default' };
  return <Badge variant={variant}>{label}</Badge>;
}
