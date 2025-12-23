import { motion } from "framer-motion";
import { Sparkles, Eye, Languages, Volume2, Brain } from "lucide-react";

interface AnalyzingOverlayProps {
  imageUrl: string;
  currentStep: number;
}

const steps = [
  { icon: Eye, label: "Scanning Artwork", description: "Analyzing visual elements..." },
  { icon: Brain, label: "AI Processing", description: "Extracting artwork details..." },
  { icon: Languages, label: "Translating", description: "Converting to multiple languages..." },
  { icon: Volume2, label: "Generating Audio", description: "Creating audio guides..." },
];

export const AnalyzingOverlay = ({ imageUrl, currentStep }: AnalyzingOverlayProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-xl"
    >
      <div className="max-w-4xl w-full mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image with scanning effect */}
          <div className="relative">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative rounded-2xl overflow-hidden shadow-card"
            >
              <img
                src={imageUrl}
                alt="Analyzing artwork"
                className="w-full aspect-[4/3] object-cover"
              />

              {/* Scanning line effect */}
              <motion.div
                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
                style={{ top: "0%" }}
                animate={{
                  top: ["0%", "100%", "0%"],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Corner brackets */}
              <div className="absolute inset-4 border-2 border-primary/30 rounded-lg pointer-events-none">
                <motion.div
                  className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-primary"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-primary"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-primary"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                />
                <motion.div
                  className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-primary"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                />
              </div>

              {/* Glow overlay */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent"
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>

            {/* Floating particles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                }}
                animate={{
                  y: [0, -20, 0],
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
          </div>

          {/* Steps */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 mb-8"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center"
              >
                <Sparkles className="w-6 h-6 text-primary" />
              </motion.div>
              <div>
                <h2 className="font-display text-2xl text-foreground">Analyzing Artwork</h2>
                <p className="text-muted-foreground">Please wait while AI processes your artwork</p>
              </div>
            </motion.div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                    index === currentStep
                      ? "bg-primary/10 border border-primary/30"
                      : index < currentStep
                      ? "bg-card border border-border opacity-60"
                      : "bg-card/50 border border-border/50 opacity-40"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    index === currentStep
                      ? "bg-primary text-primary-foreground"
                      : index < currentStep
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {index === currentStep ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <step.icon className="w-5 h-5" />
                      </motion.div>
                    ) : index < currentStep ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                      >
                        <span className="text-xs text-primary-foreground">✓</span>
                      </motion.div>
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      index === currentStep ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {step.label}
                    </p>
                    {index === currentStep && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-muted-foreground"
                      >
                        {step.description}
                      </motion.p>
                    )}
                  </div>
                  {index === currentStep && (
                    <motion.div
                      className="flex gap-1"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary"
                          animate={{ scale: [1, 1.5, 1] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.2,
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
