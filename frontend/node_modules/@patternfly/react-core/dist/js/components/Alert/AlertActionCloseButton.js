"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertActionCloseButton = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Button_1 = require("../Button");
const times_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/times-icon'));
const AlertContext_1 = require("./AlertContext");
const AlertGroupContext_1 = require("./AlertGroupContext");
const alert_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Alert/alert-group"));
const AlertActionCloseButton = (_a) => {
    var { className, onClose = () => undefined, 'aria-label': ariaLabel = '', variantLabel } = _a, props = tslib_1.__rest(_a, ["className", "onClose", 'aria-label', "variantLabel"]);
    const closeButtonRef = (0, react_1.useRef)(null);
    const { hasAnimations, updateTransitionEnd } = (0, react_1.useContext)(AlertGroupContext_1.AlertGroupContext);
    const { offstageRight } = alert_group_1.default.modifiers;
    const getParentAlertGroupItem = () => { var _a; return (_a = closeButtonRef.current) === null || _a === void 0 ? void 0 : _a.closest(`.${alert_group_1.default.alertGroupItem}`); };
    const handleOnClick = () => {
        var _a;
        if (hasAnimations) {
            (_a = getParentAlertGroupItem()) === null || _a === void 0 ? void 0 : _a.classList.add(offstageRight);
            updateTransitionEnd(onClose);
        }
        else {
            onClose();
        }
    };
    return ((0, jsx_runtime_1.jsx)(AlertContext_1.AlertContext.Consumer, { children: ({ title, variantLabel: alertVariantLabel }) => ((0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ ref: closeButtonRef, variant: Button_1.ButtonVariant.plain, onClick: handleOnClick, "aria-label": ariaLabel === '' ? `Close ${variantLabel || alertVariantLabel} alert: ${title}` : ariaLabel, className: className, icon: (0, jsx_runtime_1.jsx)(times_icon_1.default, {}) }, props))) }));
};
exports.AlertActionCloseButton = AlertActionCloseButton;
exports.AlertActionCloseButton.displayName = 'AlertActionCloseButton';
//# sourceMappingURL=AlertActionCloseButton.js.map