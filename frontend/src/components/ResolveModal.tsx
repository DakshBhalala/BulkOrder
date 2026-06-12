import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ShieldAlert, CreditCard, KeyRound } from "lucide-react";

interface AlertItem {
  id: number;
  type: string;
  warning: string;
  status: string;
  orderUnit?: string;
  email?: string;
  created: string;
}

interface ResolveModalProps {
  alert: AlertItem | null;
  isOpen: boolean;
  onClose: () => void;
  onResolved: () => void;
}

export function ResolveModal({ alert, isOpen, onClose, onResolved }: ResolveModalProps) {
  const [otp, setOtp] = useState("");
  const [selectedCard, setSelectedCard] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!alert) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Step 1: Submit resolution data to the bot/automation backend
      const resData = alert.type === "OTP_REQUIRED" ? { otp } : { cardId: selectedCard };
      const resumeRes = await fetch(`/api/campaigns/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: alert.orderUnit, resolution: resData })
      });
      
      if (!resumeRes.ok) throw new Error("Failed to resume campaign");

      // Step 2: Mark alert as resolved
      const resolveRes = await fetch(`/api/alerts/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: alert.id })
      });
      
      if (!resolveRes.ok) throw new Error("Failed to mark alert as resolved");
      
      toast.success("Resolution applied. Campaign resumed!");
      onResolved();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to resolve alert");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {alert.type === "OTP_REQUIRED" ? (
              <><KeyRound className="w-5 h-5 text-orange-500" /> OTP Required</>
            ) : alert.type === "CARD_DECLINED" ? (
              <><CreditCard className="w-5 h-5 text-red-500" /> Payment Declined</>
            ) : (
              <><ShieldAlert className="w-5 h-5 text-yellow-500" /> Account Locked</>
            )}
          </DialogTitle>
          <DialogDescription>
            {alert.warning}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {alert.type === "OTP_REQUIRED" && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Enter 6-digit OTP sent to {alert.email}</label>
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="text-center text-xl tracking-widest font-mono py-6"
              />
            </div>
          )}

          {alert.type === "CARD_DECLINED" && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Select Alternative Payment Method</label>
              <Select value={selectedCard} onValueChange={(val) => setSelectedCard(val || "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a saved card..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ICICI_1234">ICICI Bank (...1234)</SelectItem>
                  <SelectItem value="HDFC_5678">HDFC Bank (...5678)</SelectItem>
                  <SelectItem value="SBI_9012">SBI (...9012)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {alert.type === "ACCOUNT_LOCKED" && (
            <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-sm">
              This account requires manual intervention. Log in via your browser to resolve the lock, then click Resume below.
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || (alert.type === "OTP_REQUIRED" && otp.length < 4)}>
            {isSubmitting ? "Resuming..." : "Apply & Resume Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
