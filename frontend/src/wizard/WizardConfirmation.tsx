export function WizardConfirmation({
  message,
  onHome,
}: {
  message: string;
  onHome: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-7 py-10 text-center">
      <div className="w-[84px] h-[84px] rounded-full bg-success-bg text-success flex items-center justify-center text-4xl mb-5.5">
        ✓
      </div>
      <div className="text-2xl font-extrabold mb-2">Pedido agendado</div>
      <div className="text-base text-muted leading-relaxed mb-7.5">{message}</div>
      <button
        type="button"
        onClick={onHome}
        className="w-full box-border bg-primary text-white py-4.5 px-7 rounded-input text-[17px] font-bold"
      >
        Ver entregas
      </button>
    </div>
  );
}
