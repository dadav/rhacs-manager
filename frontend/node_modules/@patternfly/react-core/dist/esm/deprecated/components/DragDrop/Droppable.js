import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { Children, cloneElement } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/DragDrop/drag-drop.mjs';
import { DroppableContext } from './DroppableContext';
export const Droppable = (_a) => {
    var { className, children, zone = 'defaultZone', droppableId = 'defaultId', hasNoWrapper = false } = _a, props = __rest(_a, ["className", "children", "zone", "droppableId", "hasNoWrapper"]);
    const childProps = Object.assign({ 'data-pf-droppable': zone, 'data-pf-droppableid': droppableId, 
        // if has no wrapper is set, don't overwrite children className with the className prop
        className: hasNoWrapper && Children.count(children) === 1
            ? css(styles.droppable, className, children.props.className)
            : css(styles.droppable, className) }, props);
    return (_jsx(DroppableContext.Provider, { value: { zone, droppableId }, children: hasNoWrapper ? (cloneElement(children, childProps)) : (_jsx("div", Object.assign({}, childProps, { children: children }))) }));
};
Droppable.displayName = 'Droppable';
//# sourceMappingURL=Droppable.js.map