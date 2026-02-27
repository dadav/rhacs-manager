"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WizardBody = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const wizard_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Wizard/wizard"));
const react_styles_1 = require("@patternfly/react-styles");
const WizardDrawerWrapper_1 = require("./WizardDrawerWrapper");
const Drawer_1 = require("../../../components/Drawer");
const util_1 = require("../../../helpers/util");
const resizeObserver_1 = require("../../../helpers/resizeObserver");
const WizardBody = ({ children, hasNoBodyPadding = false, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, mainComponent = 'div', hasDrawer, isDrawerExpanded, onExpandDrawer, activeStep }) => {
    const MainComponent = mainComponent;
    const [hasScrollbar, setHasScrollbar] = (0, react_1.useState)(false);
    const [previousWidth, setPreviousWidth] = (0, react_1.useState)(undefined);
    const wizardBodyRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const resize = () => {
            if (wizardBodyRef === null || wizardBodyRef === void 0 ? void 0 : wizardBodyRef.current) {
                const { offsetWidth, offsetHeight, scrollHeight } = wizardBodyRef.current;
                if (previousWidth !== offsetWidth) {
                    setPreviousWidth(offsetWidth);
                    setHasScrollbar(offsetHeight < scrollHeight);
                }
            }
        };
        const handleResizeWithDelay = (0, util_1.debounce)(resize, 250);
        let observer = () => { };
        if (wizardBodyRef === null || wizardBodyRef === void 0 ? void 0 : wizardBodyRef.current) {
            observer = (0, resizeObserver_1.getResizeObserver)(wizardBodyRef.current, handleResizeWithDelay);
            const { offsetHeight, scrollHeight } = wizardBodyRef.current;
            setHasScrollbar(offsetHeight < scrollHeight);
            setPreviousWidth(wizardBodyRef.current.offsetWidth);
        }
        return () => {
            observer();
        };
    }, []);
    return ((0, jsx_runtime_1.jsx)(MainComponent, Object.assign({}, (mainComponent === 'div' && hasScrollbar && { role: 'region' }), (hasScrollbar && { 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, tabIndex: 0 }), { ref: wizardBodyRef, className: (0, react_styles_1.css)(wizard_1.default.wizardMain), children: (0, jsx_runtime_1.jsx)(WizardDrawerWrapper_1.WizardDrawerWrapper, { hasDrawer: hasDrawer && activeStep.drawerPanelContent, wrapper: (children) => ((0, jsx_runtime_1.jsx)(Drawer_1.Drawer, { isInline: true, isExpanded: isDrawerExpanded, onExpand: onExpandDrawer, children: (0, jsx_runtime_1.jsx)(Drawer_1.DrawerContent, { panelContent: activeStep.drawerPanelContent, children: children }) })), children: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(wizard_1.default.wizardMainBody, hasNoBodyPadding && wizard_1.default.modifiers.noPadding), children: children }) }) })));
};
exports.WizardBody = WizardBody;
exports.WizardBody.displayName = 'WizardBody';
//# sourceMappingURL=WizardBody.js.map