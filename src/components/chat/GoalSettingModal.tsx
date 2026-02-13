"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { LearnerGoal, GoalType } from "@/types/chat";
import { GOAL_TYPES } from "@/types/chat";

interface GoalSettingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (goal: LearnerGoal) => void;
  onSkip: () => void;
}

export function GoalSettingModal({
  open,
  onOpenChange,
  onSubmit,
  onSkip,
}: GoalSettingModalProps) {
  const [step, setStep] = useState<"type" | "details">("type");
  const [selectedType, setSelectedType] = useState<GoalType | null>(null);
  const [description, setDescription] = useState("");
  const [showCriteria, setShowCriteria] = useState(false);
  const [successCriteria, setSuccessCriteria] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep("type");
      setSelectedType(null);
      setDescription("");
      setShowCriteria(false);
      setSuccessCriteria("");
    }
  }, [open]);

  const handleTypeSelect = (type: GoalType) => {
    setSelectedType(type);
    setStep("details");
  };

  const handleSubmit = () => {
    if (!selectedType || !description.trim()) return;

    const goal: LearnerGoal = {
      id: crypto.randomUUID(),
      type: selectedType,
      description: description.trim(),
      successCriteria: successCriteria.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(goal);
    handleClose();
  };

  const handleSkip = () => {
    onSkip();
    handleClose();
  };

  const handleClose = () => {
    setStep("type");
    setSelectedType(null);
    setDescription("");
    setShowCriteria(false);
    setSuccessCriteria("");
    onOpenChange(false);
  };

  const selectedTypeConfig = GOAL_TYPES.find((t) => t.type === selectedType);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              flag
            </span>
            今回の目標を決めよう
          </DialogTitle>
        </DialogHeader>

        {step === "type" ? (
          <TypeSelectionStep onSelect={handleTypeSelect} onSkip={handleSkip} />
        ) : (
          <DetailsStep
            selectedTypeConfig={selectedTypeConfig!}
            description={description}
            onDescriptionChange={setDescription}
            showCriteria={showCriteria}
            onToggleCriteria={() => setShowCriteria(!showCriteria)}
            successCriteria={successCriteria}
            onSuccessCriteriaChange={setSuccessCriteria}
            onBack={() => setStep("type")}
            onSubmit={handleSubmit}
            onSkip={handleSkip}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TypeSelectionStepProps {
  onSelect: (type: GoalType) => void;
  onSkip: () => void;
}

function TypeSelectionStep({ onSelect, onSkip }: TypeSelectionStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        目標を決めると、学習の方向性が明確になります。
        <br />
        スキップして自由に始めることもできます。
      </p>

      {/* Goal Type Cards */}
      <div className="grid grid-cols-2 gap-3">
        {GOAL_TYPES.map((config) => (
          <button
            key={config.type}
            onClick={() => onSelect(config.type)}
            className="flex flex-col items-start gap-2 p-4 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-muted/30 transition-all text-left"
          >
            <span className="material-symbols-outlined text-primary text-2xl">
              {config.icon}
            </span>
            <div>
              <p className="font-medium text-sm">{config.label}</p>
              <p className="text-xs text-muted-foreground">
                {config.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Skip Action */}
      <button
        onClick={onSkip}
        className="w-full py-2.5 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        スキップして始める
      </button>
    </div>
  );
}

interface DetailsStepProps {
  selectedTypeConfig: (typeof GOAL_TYPES)[number];
  description: string;
  onDescriptionChange: (value: string) => void;
  showCriteria: boolean;
  onToggleCriteria: () => void;
  successCriteria: string;
  onSuccessCriteriaChange: (value: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  onSkip: () => void;
}

function DetailsStep({
  selectedTypeConfig,
  description,
  onDescriptionChange,
  showCriteria,
  onToggleCriteria,
  successCriteria,
  onSuccessCriteriaChange,
  onBack,
  onSubmit,
  onSkip,
}: DetailsStepProps) {
  const canSubmit = description.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        戻る
      </button>

      {/* Selected Type Badge */}
      <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10">
        <span className="material-symbols-outlined text-primary text-lg">
          {selectedTypeConfig.icon}
        </span>
        <span className="text-sm font-medium">{selectedTypeConfig.label}</span>
      </div>

      {/* Goal Description */}
      <div>
        <label className="block text-sm font-medium mb-2">
          どんな目標ですか？
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={selectedTypeConfig.placeholder}
          className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          autoFocus
        />
      </div>

      {/* Success Criteria (Optional) */}
      <div>
        <button
          onClick={onToggleCriteria}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="material-symbols-outlined text-lg">
            {showCriteria ? "expand_less" : "expand_more"}
          </span>
          達成条件を追加（任意）
        </button>
        {showCriteria && (
          <textarea
            value={successCriteria}
            onChange={(e) => onSuccessCriteriaChange(e.target.value)}
            placeholder="例: テストを書いてすべてパスする"
            className="w-full mt-2 min-h-[60px] p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={cn(
            "w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors",
            canSubmit
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          この目標で始める
        </button>
        <button
          onClick={onSkip}
          className="w-full py-2.5 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          スキップして始める
        </button>
      </div>
    </div>
  );
}
