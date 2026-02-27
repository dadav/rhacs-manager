import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Tabs/tabs.mjs';
import { Button } from '../Button';
import { getOUIAProps } from '../../helpers';
const TabActionBase = (_a) => {
    var { children, className, onClick, isDisabled, 'aria-label': ariaLabel = 'Tab action', innerRef, ouiaId, ouiaSafe } = _a, props = __rest(_a, ["children", "className", "onClick", "isDisabled", 'aria-label', "innerRef", "ouiaId", "ouiaSafe"]);
    return (_jsx("span", { className: css(styles.tabsItemAction, className), children: _jsx(Button, Object.assign({ ref: innerRef, type: "button", variant: "plain", "aria-label": ariaLabel, onClick: onClick, isDisabled: isDisabled, icon: _jsx("span", { className: css(styles.tabsItemActionIcon), children: children }) }, getOUIAProps(TabAction.displayName, ouiaId, ouiaSafe), props)) }));
};
export const TabAction = forwardRef((props, ref) => (_jsx(TabActionBase, Object.assign({}, props, { innerRef: ref }))));
TabAction.displayName = 'TabAction';
//# sourceMappingURL=TabAction.js.map