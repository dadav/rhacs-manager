"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWizardFooter = void 0;
const react_1 = require("react");
const WizardContext_1 = require("../WizardContext");
/**
 * Set a unique footer for the wizard. stepId is only required if inactive steps are hidden instead of unmounted.
 * @param footer
 * @param stepId
 */
const useWizardFooter = (footer, stepId) => {
    const { activeStep, setFooter } = (0, WizardContext_1.useWizardContext)();
    (0, react_1.useEffect)(() => {
        if (footer && (!stepId || (activeStep === null || activeStep === void 0 ? void 0 : activeStep.id) === stepId)) {
            setFooter(footer);
            // Reset the footer on unmount.
            return () => {
                setFooter(null);
            };
        }
    }, [activeStep, footer, setFooter, stepId]);
};
exports.useWizardFooter = useWizardFooter;
//# sourceMappingURL=useWizardFooter.js.map