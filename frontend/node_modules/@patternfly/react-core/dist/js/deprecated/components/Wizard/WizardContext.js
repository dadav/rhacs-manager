"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardContextConsumer = exports.WizardContextProvider = exports.WizardContext = void 0;
const react_1 = require("react");
exports.WizardContext = (0, react_1.createContext)({
    goToStepById: () => null,
    goToStepByName: () => null,
    onNext: () => null,
    onBack: () => null,
    onClose: () => null,
    activeStep: { name: null }
});
exports.WizardContextProvider = exports.WizardContext.Provider;
exports.WizardContextConsumer = exports.WizardContext.Consumer;
//# sourceMappingURL=WizardContext.js.map