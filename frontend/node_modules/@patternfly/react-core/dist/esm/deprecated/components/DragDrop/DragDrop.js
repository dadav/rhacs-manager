import { jsx as _jsx } from "react/jsx-runtime";
import { createContext } from 'react';
export const DragDropContext = createContext({
    onDrag: (_source) => true,
    onDragMove: (_source, _dest) => { },
    onDrop: (_source, _dest) => false
});
export const DragDrop = ({ children, onDrag = () => true, onDragMove = () => { }, onDrop = () => false }) => (_jsx(DragDropContext.Provider, { value: { onDrag, onDragMove, onDrop }, children: children }));
DragDrop.displayName = 'DragDrop';
//# sourceMappingURL=DragDrop.js.map