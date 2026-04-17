import QRCode from "qrcode";

type Props = {
  code: string;
  openUntil: Date;
  checkInUrl: string;
};

export async function CheckInDisplay({ code, openUntil, checkInUrl }: Props) {
  const qrSvg = await QRCode.toString(checkInUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });

  return (
    <div className="card p-6">
      <div className="text-sm text-slate-500">Check-in is OPEN</div>
      <div className="mt-1 text-xs text-slate-500">
        Until {openUntil.toLocaleTimeString()}
      </div>

      <div className="mt-4 grid gap-6 md:grid-cols-2 items-center">
        <div>
          <div className="text-sm text-slate-500">Code</div>
          <div className="mt-1 font-mono text-5xl tracking-widest font-bold">
            {code}
          </div>
          <div className="mt-3 text-sm text-slate-600">
            Students enter this at <span className="font-mono">/events/[id]/checkin</span>
            {" "}or scan the QR code.
          </div>
        </div>
        <div className="flex justify-center">
          <div
            className="rounded-md bg-white p-3 ring-1 ring-slate-200"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        </div>
      </div>
    </div>
  );
}
