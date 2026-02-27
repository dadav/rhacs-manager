import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { isCustomWizardFooter, isWizardSubStep } from './types';
import { WizardFooter } from './WizardFooter';
export const WizardContext = createContext({});
export const WizardContextProvider = ({ steps: initialSteps, footer: initialFooter, activeStepIndex, children, onNext, onBack, onClose, goToStepById, goToStepByName, goToStepByIndex, shouldFocusContent, mainWrapperRef }) => {
    const [currentSteps, setCurrentSteps] = useState(initialSteps);
    const [currentFooter, setCurrentFooter] = useState();
    // Callback to update steps if the overall step number changes
    useEffect(() => {
        if (currentSteps.length !== initialSteps.length) {
            const newSteps = initialSteps.map((newStep) => {
                const currentStepMatch = currentSteps.find((step) => step.id === newStep.id);
                // If an existing step has the same id as a new step, carry over props
                if (currentStepMatch) {
                    return Object.assign(Object.assign({}, currentStepMatch), newStep);
                }
                return newStep;
            });
            setCurrentSteps(newSteps);
        }
    }, [currentSteps, initialSteps]);
    // Combined initial and current state steps
    const steps = useMemo(() => currentSteps.map((currentStepProps, index) => (Object.assign(Object.assign({}, currentStepProps), initialSteps[index]))), [initialSteps, currentSteps]);
    const activeStep = useMemo(() => steps.find((step) => step.index === activeStepIndex), [activeStepIndex, steps]);
    const close = useCallback(() => onClose === null || onClose === void 0 ? void 0 : onClose(null), [onClose]);
    const goToNextStep = useCallback(() => onNext(null, steps), [onNext, steps]);
    const goToPrevStep = useCallback(() => onBack(null, steps), [onBack, steps]);
    const footer = useMemo(() => {
        const wizardFooter = (activeStep === null || activeStep === void 0 ? void 0 : activeStep.footer) || currentFooter || initialFooter;
        if (isCustomWizardFooter(wizardFooter)) {
            const customFooter = wizardFooter;
            return typeof customFooter === 'function'
                ? customFooter(activeStep, goToNextStep, goToPrevStep, close)
                : customFooter;
        }
        return (_jsx(WizardFooter, Object.assign({ activeStep: activeStep, onNext: goToNextStep, onBack: goToPrevStep, onClose: close, isBackDisabled: (activeStep === null || activeStep === void 0 ? void 0 : activeStep.index) === 1 || (isWizardSubStep(activeStep) && (activeStep === null || activeStep === void 0 ? void 0 : activeStep.index) === 2) }, wizardFooter)));
    }, [currentFooter, initialFooter, activeStep, goToNextStep, goToPrevStep, close]);
    const getStep = useCallback((stepId) => steps.find((step) => step.id === stepId), [steps]);
    const setStep = useCallback((step) => setCurrentSteps((prevSteps) => prevSteps.map((prevStep) => {
        if (prevStep.id === step.id) {
            return Object.assign(Object.assign({}, prevStep), step);
        }
        return prevStep;
    })), []);
    return (_jsx(WizardContext.Provider, { value: {
            steps,
            activeStep,
            footer,
            close,
            getStep,
            setStep,
            goToNextStep,
            goToPrevStep,
            setFooter: setCurrentFooter,
            goToStepById: useCallback((id) => goToStepById(steps, id), [goToStepById, steps]),
            goToStepByName: useCallback((name) => goToStepByName(steps, name), [goToStepByName, steps]),
            goToStepByIndex: useCallback((index) => goToStepByIndex(null, steps, index), [goToStepByIndex, steps]),
            shouldFocusContent,
            mainWrapperRef
        }, children: children }));
};
WizardContextProvider.displayName = 'WizardContextProvider';
export const useWizardContext = () => useContext(WizardContext);
//# sourceMappingURL=WizardContext.js.map