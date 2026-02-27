import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useContext } from 'react';
import { Button, ButtonVariant } from '../Button';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
import { AlertContext } from './AlertContext';
import { AlertGroupContext } from './AlertGroupContext';
import alertGroupStyles from '@patternfly/react-styles/css/components/Alert/alert-group.mjs';
export const AlertActionCloseButton = (_a) => {
    var { className, onClose = () => undefined, 'aria-label': ariaLabel = '', variantLabel } = _a, props = __rest(_a, ["className", "onClose", 'aria-label', "variantLabel"]);
    const closeButtonRef = useRef(null);
    const { hasAnimations, updateTransitionEnd } = useContext(AlertGroupContext);
    const { offstageRight } = alertGroupStyles.modifiers;
    const getParentAlertGroupItem = () => { var _a; return (_a = closeButtonRef.current) === null || _a === void 0 ? void 0 : _a.closest(`.${alertGroupStyles.alertGroupItem}`); };
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
    return (_jsx(AlertContext.Consumer, { children: ({ title, variantLabel: alertVariantLabel }) => (_jsx(Button, Object.assign({ ref: closeButtonRef, variant: ButtonVariant.plain, onClick: handleOnClick, "aria-label": ariaLabel === '' ? `Close ${variantLabel || alertVariantLabel} alert: ${title}` : ariaLabel, className: className, icon: _jsx(TimesIcon, {}) }, props))) }));
};
AlertActionCloseButton.displayName = 'AlertActionCloseButton';
//# sourceMappingURL=AlertActionCloseButton.js.map