"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWizardContext = exports.WizardContextProvider = exports.WizardContext = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const types_1 = require("./types");
const WizardFooter_1 = require("./WizardFooter");
exports.WizardContext = (0, react_1.createContext)({});
const WizardContextProvider = ({ steps: initialSteps, footer: initialFooter, activeStepIndex, children, onNext, onBack, onClose, goToStepById, goToStepByName, goToStepByIndex, shouldFocusContent, mainWrapperRef }) => {
    const [currentSteps, setCurrentSteps] = (0, react_1.useState)(initialSteps);
    const [currentFooter, setCurrentFooter] = (0, react_1.useState)();
    // Callback to update steps if the overall step number changes
    (0, react_1.useEffect)(() => {
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
    const steps = (0, react_1.useMemo)(() => currentSteps.map((currentStepProps, index) => (Object.assign(Object.assign({}, currentStepProps), initialSteps[index]))), [initialSteps, currentSteps]);
    const activeStep = (0, react_1.useMemo)(() => steps.find((step) => step.index === activeStepIndex), [activeStepIndex, steps]);
    const close = (0, react_1.useCallback)(() => onClose === null || onClose === void 0 ? void 0 : onClose(null), [onClose]);
    const goToNextStep = (0, react_1.useCallback)(() => onNext(null, steps), [onNext, steps]);
    const goToPrevStep = (0, react_1.useCallback)(() => onBack(null, steps), [onBack, steps]);
    const footer = (0, react_1.useMemo)(() => {
        const wizardFooter = (activeStep === null || activeStep === void 0 ? void 0 : activeStep.footer) || currentFooter || initialFooter;
        if ((0, types_1.isCustomWizardFooter)(wizardFooter)) {
            const customFooter = wizardFooter;
            return typeof customFooter === 'function'
                ? customFooter(activeStep, goToNextStep, goToPrevStep, close)
                : customFooter;
        }
        return ((0, jsx_runtime_1.jsx)(WizardFooter_1.WizardFooter, Object.assign({ activeStep: activeStep, onNext: goToNextStep, onBack: goToPrevStep, onClose: close, isBackDisabled: (activeStep === null || activeStep === void 0 ? void 0 : activeStep.index) === 1 || ((0, types_1.isWizardSubStep)(activeStep) && (activeStep === null || activeStep === void 0 ? void 0 : activeStep.index) === 2) }, wizardFooter)));
    }, [currentFooter, initialFooter, activeStep, goToNextStep, goToPrevStep, close]);
    const getStep = (0, react_1.useCallback)((stepId) => steps.find((step) => step.id === stepId), [steps]);
    const setStep = (0, react_1.useCallback)((step) => setCurrentSteps((prevSteps) => prevSteps.map((prevStep) => {
        if (prevStep.id === step.id) {
            return Object.assign(Object.assign({}, prevStep), step);
        }
        return prevStep;
    })), []);
    return ((0, jsx_runtime_1.jsx)(exports.WizardContext.Provider, { value: {
            steps,
            activeStep,
            footer,
            close,
            getStep,
            setStep,
            goToNextStep,
            goToPrevStep,
            setFooter: setCurrentFooter,
            goToStepById: (0, react_1.useCallback)((id) => goToStepById(steps, id), [goToStepById, steps]),
            goToStepByName: (0, react_1.useCallback)((name) => goToStepByName(steps, name), [goToStepByName, steps]),
            goToStepByIndex: (0, react_1.useCallback)((index) => goToStepByIndex(null, steps, index), [goToStepByIndex, steps]),
            shouldFocusContent,
            mainWrapperRef
        }, children: children }));
};
exports.WizardContextProvider = WizardContextProvider;
exports.WizardContextProvider.displayName = 'WizardContextProvider';
const useWizardContext = () => (0, react_1.useContext)(exports.WizardContext);
exports.useWizardContext = useWizardContext;
//# sourceMappingURL=WizardContext.js.map