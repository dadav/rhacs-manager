import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Popover/popover.mjs';
import { Button } from '../Button';
import TimesIcon from '@patternfly/react-icons/dist/esm/icons/times-icon';
export const PopoverCloseButton = (_a) => {
    var { onClose = () => undefined } = _a, props = __rest(_a, ["onClose"]);
    return (_jsx("div", { className: css(styles.popoverClose), children: _jsx(Button, Object.assign({ onClick: onClose, variant: "plain", "aria-label": true }, props, { style: { pointerEvents: 'auto' }, icon: _jsx(TimesIcon, {}) })) }));
};
PopoverCloseButton.displayName = 'PopoverCloseButton';
//# sourceMappingURL=PopoverCloseButton.js.map