import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/DualListSelector/dual-list-selector.mjs';
import { css } from '@patternfly/react-styles';
import { GenerateId } from '../../helpers';
import { DualListSelectorContext } from './DualListSelectorContext';
import { useHasAnimations } from '../../helpers';
export const DualListSelector = (_a) => {
    var { className, children, id, isTree = false, hasAnimations: hasAnimationsProp } = _a, props = __rest(_a, ["className", "children", "id", "isTree", "hasAnimations"]);
    const hasAnimations = useHasAnimations(hasAnimationsProp);
    return (_jsx(DualListSelectorContext.Provider, { value: { isTree, hasAnimations }, children: _jsx(GenerateId, { children: (randomId) => (_jsx("div", Object.assign({ className: css(styles.dualListSelector, hasAnimations && isTree && styles.modifiers.animateExpand, className), id: id || randomId }, props, { children: children }))) }) }));
};
DualListSelector.displayName = 'DualListSelector';
//# sourceMappingURL=DualListSelector.js.map