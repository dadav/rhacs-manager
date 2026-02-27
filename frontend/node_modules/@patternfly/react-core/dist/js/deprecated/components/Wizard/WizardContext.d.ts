/// <reference types="react" />
import { WizardStep } from './Wizard';
export interface WizardContextType {
    goToStepById: (stepId: number | string) => void;
    goToStepByName: (stepName: string) => void;
    onNext: () => void;
    onBack: () => void;
    onClose: () => void;
    activeStep: WizardStep;
}
export declare const WizardContext: import("react").Context<WizardContextType>;
export declare const WizardContextProvider: import("react").Provider<WizardContextType>;
export declare const WizardContextConsumer: import("react").Consumer<WizardContextType>;
//# sourceMappingURL=WizardContext.d.ts.map