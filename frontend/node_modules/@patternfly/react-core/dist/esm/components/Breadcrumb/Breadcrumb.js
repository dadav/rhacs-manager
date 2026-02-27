import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { Children, isValidElement, cloneElement } from 'react';
import styles from '@patternfly/react-styles/css/components/Breadcrumb/breadcrumb.mjs';
import { css } from '@patternfly/react-styles';
import { useOUIAProps } from '../../helpers';
export const Breadcrumb = (_a) => {
    var { children = null, className = '', 'aria-label': ariaLabel = 'Breadcrumb', ouiaId, ouiaSafe = true } = _a, props = __rest(_a, ["children", "className", 'aria-label', "ouiaId", "ouiaSafe"]);
    const ouiaProps = useOUIAProps(Breadcrumb.displayName, ouiaId, ouiaSafe);
    return (_jsx("nav", Object.assign({}, props, { "aria-label": ariaLabel, className: css(styles.breadcrumb, className) }, ouiaProps, { children: _jsx("ol", { className: styles.breadcrumbList, role: "list", children: Children.map(children, (child, index) => {
                const showDivider = index > 0;
                if (isValidElement(child)) {
                    return cloneElement(child, { showDivider });
                }
                return child;
            }) }) })));
};
Breadcrumb.displayName = 'Breadcrumb';
//# sourceMappingURL=Breadcrumb.js.map