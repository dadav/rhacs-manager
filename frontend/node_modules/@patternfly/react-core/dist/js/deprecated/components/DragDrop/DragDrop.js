"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DragDrop = exports.DragDropContext = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
exports.DragDropContext = (0, react_1.createContext)({
    onDrag: (_source) => true,
    onDragMove: (_source, _dest) => { },
    onDrop: (_source, _dest) => false
});
const DragDrop = ({ children, onDrag = () => true, onDragMove = () => { }, onDrop = () => false }) => ((0, jsx_runtime_1.jsx)(exports.DragDropContext.Provider, { value: { onDrag, onDragMove, onDrop }, children: children }));
exports.DragDrop = DragDrop;
exports.DragDrop.displayName = 'DragDrop';
//# sourceMappingURL=DragDrop.js.map