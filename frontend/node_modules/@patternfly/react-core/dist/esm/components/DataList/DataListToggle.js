import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import styles from '@patternfly/react-styles/css/components/DataList/data-list.mjs';
import { Button, ButtonVariant } from '../Button';
export const DataListToggle = (_a) => {
    var { className = '', isExpanded = false, 'aria-controls': ariaControls = '', 'aria-label': ariaLabel = 'Details', rowid = '', id, buttonProps } = _a, props = __rest(_a, ["className", "isExpanded", 'aria-controls', 'aria-label', "rowid", "id", "buttonProps"]);
    return (_jsx("div", Object.assign({ className: css(styles.dataListItemControl, className) }, props, { children: _jsx("div", { className: css(styles.dataListToggle), children: _jsx(Button, Object.assign({ id: id, variant: ButtonVariant.plain, "aria-controls": ariaControls !== '' && ariaControls, "aria-label": ariaLabel, "aria-labelledby": ariaLabel !== 'Details' ? null : `${rowid} ${id}`, "aria-expanded": isExpanded }, buttonProps, { icon: _jsx("div", { className: css(styles.dataListToggleIcon), children: _jsx(AngleRightIcon, {}) }) })) }) })));
};
DataListToggle.displayName = 'DataListToggle';
//# sourceMappingURL=DataListToggle.js.map