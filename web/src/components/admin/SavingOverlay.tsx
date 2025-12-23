import { motion } from "framer-motion";
import { Save, Languages, Volume2, Check } from "lucide-react";
import { useState, useEffect } from "react";

interface SavingOverlayProps {
  imageUrl: string;
}

const steps = [
  { icon: Save, label: "Saving Metadata", description: "Storing artwork information..." },
  { icon: Languages, label: "Translating", description: "Converting to French and Spanish..." },
  { icon: Volume2, label: "Generating Audio", description: "Creating audio guides (this takes a minute)..." },
  { icon: Check, label: "Finalizing", description: "Completing save..." },
];

export const SavingOverlay = ({ imageUrl }: SavingOverlayProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Simulate progress through steps
  useEffect(() => {
    const timings = [2000, 15000, 45000, 5000]; // Approximate timing for each step
    let timeoutId: NodeJS.Timeout;

    const advanceStep = (step: number) => {
      if (step < steps.length - 1) {
        timeoutId = setTimeout(() => {
          setCurrentStep(step + 1);
          advanceStep(step + 1);
        }, timings[step]);
      }
    };

    advanceStep(0);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl"
    >
      <div className="max-w-2xl w-full mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Image */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative rounded-2xl overflow-hidden shadow-card"
          >
            <img
              src={imageUrl}
              alt="Saving artwork"
              className="w-full aspect-[4/3] object-cover"
            />
            <motion.div
              className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent"
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Saving indicator */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background/90 backdrop-blur-sm border border-primary/30">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full"
                />
                <span className="text-sm font-medium text-foreground">Saving to collection...</span>
              </div>
            </div>
          </motion.div>

          {/* Steps */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <h2 className="font-display text-2xl text-foreground mb-1">Saving Artwork</h2>
              <p className="text-muted-foreground text-sm">
                This may take 1-2 minutes for translations and audio...
              </p>
            </motion.div>

            {steps.map((step, index) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                  index === currentStep
                    ? "bg-primary/10 border border-primary/30"
                    : index < currentStep
                    ? "bg-card border border-border opacity-60"
                    : "bg-card/50 border border-border/50 opacity-40"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  index === currentStep
                    ? "bg-primary text-primary-foreground"
                    : index < currentStep
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {index < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : index === currentStep ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <step.icon className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    index === currentStep ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {step.label}
                  </p>
                  {index === currentStep && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-muted-foreground"
                    >
                      {step.description}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            ))}

            <p className="text-xs text-muted-foreground text-center mt-4">
              Please don't close this page
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
