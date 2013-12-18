(function(ns) {

    /**
     * Helper Methods
     */
    function getNodeData(domNode, key) {
        return domNode.getAttribute("data-" + key);
    }

    function hasNodeData(domNode, key){
        return domNode.hasAttribute("data-" + key);
    }

    function setStylePixel(domNode, key, number){
        domNode.style[key] = number + "px";
    }
    function getStylePixel(domNode, key){
        return parseInt(domNode.style[key].replace(/[^-\d\.]/g, ''));
    }

    function addClass(domNode, className){
        var oldName = domNode.className;
        if(oldName.indexOf(className) == -1)
            domNode.className += (oldName ? " " : "") + className;

    }
    function removeClass(domNode, className){
        var oldName = domNode.className;
        var idx = oldName.indexOf(className);
        if(idx != -1 )
            domNode.className = (oldName.substr(0, idx) + oldName.substr(idx + className.length)).trim();
    }

    function getOffset(domElement){
        var result = {left: 0, top: 0};
        while(domElement != null){
            result.left += domElement.offsetLeft;
            result.top += domElement.offsetTop;
            domElement = domElement.offsetParent;
        }
        return result;
    }

    function dispatchEvent(element, type, properties){
        var event = document.createEvent( "HTMLEvents", 1, 2);
        event.initEvent(type, true, true);
        if(properties)
            for(var name in properties){
                event[name] = properties[name];
            }
        element.dispatchEvent(event);
    }


    /**
     * A UberPanel container that includes severals panels that can be docked
     * @param domNode
     * @constructor
     */
    var UberContainer = function(divNode) {
        this.divNode = divNode;
        this.highlightNode = null;
        this.dockPanels = [];
        this.name = getNodeData(divNode, "ubercontainer");
        this.left = (getNodeData(divNode, "side") == "left");
        this.horizontalFlowWidth = getNodeData(divNode, "horizontal-flow-width") || 0;

        this.init();
        this.reorderPanels();
    }

    UberContainer.prototype = {
        init: function() {
            addClass(this.divNode, "ubplContainer");
            addClass(this.divNode, this.left ? "ubplLeft" : "ubplRight");

            this.highlightNode = document.createElement("div");
            addClass(this.highlightNode, "ubplHighlight");
            this.divNode.appendChild(this.highlightNode);
            this.highlightNode.style.display = 'none';


            var childLists = this.divNode.querySelectorAll("li[data-uberpanel]");
            for(var i = 0; i < childLists.length; ++i) {
                this.dockPanels.push(new UberPanel(this, childLists[i]));
            }
        },

        getMaxWidth: function(){
            return this.divNode.offsetParent.offsetWidth;
        },

        detachPanels: function(){
            var list = this.divNode.querySelector("ul");
            var i = this.dockPanels.length;
            while(i--){
                this.dockPanels[i].container = null;
            }
            this.dockPanels.length = 0;
            while(list.firstChild) list.removeChild(list.firstChild);
        },

        loadState: function(data){
            for(var i = 0; i < data.length; ++i){
                var panelData = data[i];
                var panel = c_panels[panelData.name];
                if(panel){
                    panel.loadState(panelData);
                    this.placePanel(i, panel);
                }
            }
        },

        placePanel: function(index, panel){
            addClass(panel.liNode, "ubplPlaceTransition");


            var prevContainer = panel.container;
            if(prevContainer){
                var prevIndex = prevContainer.dockPanels.indexOf(panel);
                prevContainer.dockPanels.splice(prevIndex,1);
                if(prevContainer == this && index > prevIndex) index--;
            }



            panel.clearPos();
            panel.container = this;
            var list = this.divNode.querySelector("ul");
            if(index < this.dockPanels.length){
                list.insertBefore(panel.liNode, this.dockPanels[index].liNode);
                this.dockPanels.splice(index, 0, panel);
            }
            else{
                list.appendChild(panel.liNode);
                this.dockPanels.push(panel);
            }
            if(prevContainer && prevContainer != this)
                prevContainer.reorderPanels();
            this.reorderPanels();
            removeClass(panel.liNode, "ubplPlaceTransition");
        },

        reorderPanels: function(){
            var top = 0, width = 0, prevMinPanel = null, minimizedPanels = [];
            for(var i = 0; i < this.dockPanels.length; ++i){
                var panel = this.dockPanels[i];
                if(prevMinPanel && (!panel.minimized || width > this.horizontalFlowWidth)){
                    this._reorderMinimizedPanels(top, minimizedPanels);
                    minimizedPanels = [];
                    top += prevMinPanel.getHeight();
                    width = 0;
                    prevMinPanel = null;
                }
                if(!panel.minimized)
                    panel.setPos(0, top);
                else{
                    minimizedPanels.push(panel);
                }
                if(panel.minimized){
                    prevMinPanel = panel;
                    width += panel.getWidth();
                }
                else{
                    top += panel.getHeight();
                }
            }
            this._reorderMinimizedPanels(top, minimizedPanels);
        },
        _reorderMinimizedPanels: function(top, panels){
            var x = 0;
            var i = panels.length;
            while(i--){
                var panel = panels[this.left ? panels.length - 1 - i : i];
                panel.setPos(x, top);
                x += panel.getWidth();

            }
        },
        getPlacingIndex: function(event, draggedPanel){
            var parent = this.divNode.offsetParent;
            var offset = getOffset(parent);

            var x = event.clientX - offset.left, y = event.clientY - offset.top;
            if(!this.left) x = parent.offsetWidth - x;
            if(this.dockPanels.length == 0){
                return x < 300 ? 0 : -1;
            }
            var dest = -1;
            for(var i = 0; i < this.dockPanels.length; ++i){
                var panel = this.dockPanels[i];
                if(panel != draggedPanel){
                    var pos = panel.getPos(), width = panel.getWidth(), height = panel.getHeight();
                    var paddingX = panel.minimized ? 32 : 0, paddingY = panel.minimized ? 0 : 32;
                    if(pos.x - paddingX <= x && pos.x + width + paddingX  >= x
                    && pos.y - paddingY <= y && pos.y + height + paddingY >= y){
                        if( (!panel.minimized && y < pos.y + height / 2)
                            || (panel.minimized && x < pos.x + width / 2)){
                            dest = panel.minimized && !this.left ? i+1 : i;
                            break;
                        }
                        else{
                            dest = panel.minimized && !this.left ? i : i+1;
                            break;
                        }
                    }
                }
            }
            if(this.dockPanels[dest] == draggedPanel || this.dockPanels[dest-1] == draggedPanel)
                return -1;
            else
                return dest;
        },
        showPlacingHightlight: function(index, draggedPanel){
            this.highlightNode.style.display = 'block';
            this.highlightNode.style.removeProperty('left');
            this.highlightNode.style.removeProperty('right');
            this.highlightNode.style.removeProperty('width');
            this.highlightNode.style.removeProperty('height');
            if(this.dockPanels.length == 0){
                addClass(this.highlightNode, "ubplVertical");
                setStylePixel(this.highlightNode, this.left ? 'left' : 'right', 0);
                setStylePixel(this.highlightNode, 'top', 0);
                var parent = this.divNode.offsetParent;
                setStylePixel(this.highlightNode, 'height', parent.offsetHeight || 300);
            }
            else{
                var end = false;
                if( index == this.dockPanels.length || (index > 0 && draggedPanel.minimized != this.dockPanels[index].minimized)){
                    end = true; index--;
                }
                var panel = this.dockPanels[index];


                var pos = panel.getPos();
                if(panel.minimized){
                    addClass(this.highlightNode, "ubplVertical");
                    pos.x += ( end == this.left ? panel.getWidth() : 0 );
                    setStylePixel(this.highlightNode, 'height', panel.getHeight());
                }
                else {
                    removeClass(this.highlightNode, "ubplVertical");
                    pos.y += ( end ? panel.getHeight() : 0 );
                    setStylePixel(this.highlightNode, 'width', panel.getWidth());
                }
                setStylePixel(this.highlightNode, this.left ? 'left' : 'right', pos.x);
                setStylePixel(this.highlightNode, 'top', pos.y);
            }


        },
        clearPlacingHightlight: function(){
            this.highlightNode.style.display = 'none';
        },

        getSaveData: function(){
            var data = [];
            for(var i = 0; i < this.dockPanels.length; ++i){
                data[i] = this.dockPanels[i].getSaveData();
            }
            return data;
        }

    };

    var c_panelInnerStylePaddingY;
    function initStylePadding(panel){
        c_panelInnerStylePaddingY = panel.liNode.offsetHeight;
        c_panelInnerStylePaddingY -= panel.headerNode.offsetHeight;
        c_panelInnerStylePaddingY -= panel.editorNode.offsetHeight;
    }


    var UberPanel = function(container, liNode) {
        this.name = getNodeData(liNode, "uberpanel");
        this.container = container;
        this.liNode = liNode;
        this.headerNode = null;
        this.editorNode = null;
        this.minimized = false;
        this.fixHeight = hasNodeData(liNode, "fix-height");
        this.width = this.getWidth();
        this.height = this.getHeight();
        this.init();
    }

    UberPanel.prototype = {
        init: function(){
            if(c_panels[this.name])
                throw new Error("Uberpanels: two panels with the same name: " + this.name);

            c_panels[this.name] = this;

            addClass(this.liNode, "ubplPanel");
            if(this.fixHeight)
                addClass(this.liNode, "ubplFixed");
            this.createDomNodes();
            if(c_panelInnerStylePaddingY == undefined)
                initStylePadding(this);
            if(!this.fixHeight) {
                this.setWidth(getNodeData(this.liNode, 'default-width') || 300);
                this.setHeight(getNodeData(this.liNode, 'default-height') || 100);
            }
            else{
                this.setWidth(getNodeData(this.liNode, 'default-width') || this.getWidth());
            }
        },
        createDomNodes: function(){
            var self = this;

            this.headerNode = document.createElement("div");
            addClass(this.headerNode, "ubplHeader");
            this.headerNode.innerHTML = getNodeData(this.liNode, 'title');
            this.headerNode.addEventListener("mousedown", function(e){
                return DragManager.startDrag("dragPanel", e, self)
            });


            this.editorNode = document.createElement("div");
            addClass(this.editorNode, "ubplEditor");
            while(this.liNode.firstChild)
                this.editorNode.appendChild(this.liNode.firstChild);

            var scrollBar = document.createElement("div");
            addClass(scrollBar, "ubplVerticalBar");
            this.liNode.appendChild(scrollBar);
            scrollBar.addEventListener("mousedown", function(e){
                return DragManager.startDrag("dragWidth", e, self)
            });

            if(!this.fixHeight){
                scrollBar = document.createElement("div");
                addClass(scrollBar, "ubplHorizontalBar");
                this.liNode.appendChild(scrollBar);
                scrollBar.addEventListener("mousedown", function(e){
                    return DragManager.startDrag("dragHeight", e, self)
                });
                scrollBar = document.createElement("div");
                addClass(scrollBar, "ubplCornerBar");
                this.liNode.appendChild(scrollBar);
                scrollBar.addEventListener("mousedown", function(e){
                    return DragManager.startDrag("dragCorner", e, self)
                });
            }
            this.liNode.appendChild(this.headerNode);
            this.liNode.appendChild(this.editorNode);
        },
        setMinimized: function(minimized){
            if(this.minimized == minimized)
                return;
            this.minimized = minimized;
            if(this.minimized)
                addClass(this.liNode, "ubplMinimized");
            else
                removeClass(this.liNode, "ubplMinimized");
            if(this.minimized){
                this.liNode.style.removeProperty('width');
            }
            else{
                this.setWidth(this.width);
            }
        },

        clearPos: function(){
            this.liNode.style.removeProperty('left');
            this.liNode.style.removeProperty('right');
            this.liNode.style.removeProperty('top');
        },

        getPos: function(){
            return {
                x : getStylePixel(this.liNode, this.container.left ? 'left' : 'right'),
                y: getStylePixel(this.liNode, 'top')
            };
        },

        setPos: function(x, y){
            this.liNode.style.removeProperty('left');
            this.liNode.style.removeProperty('right');
            setStylePixel(this.liNode, this.container.left ? 'left' : 'right', x);
            setStylePixel(this.liNode, 'top', y);
        },


        getWidth: function(){
            return this.liNode.offsetWidth;
        },


        setWidth: function(width){
            var maxWidth = this.container.getMaxWidth() - 50;
            var width = Math.max(120, Math.min(maxWidth, width));

            this.width = width;
            if(!this.minimized){
                setStylePixel(this.liNode, "width", width);
                this.container.reorderPanels();
            }
        },

        getHeight: function(){
            return this.liNode.offsetHeight;
        },

        setHeight: function(height){
            if(this.fixHeight) return;
            this.height = height;

            var editorHeight = height - this.headerNode.offsetHeight - c_panelInnerStylePaddingY;
            setStylePixel(this.editorNode, "height", editorHeight);
            this.container.reorderPanels();

        },
        getSaveData: function(){
            return {
                name: this.name,
                minimized: this.minimized,
                width: this.width,
                height: this.height
            };
        },
        loadState: function(data){
            this.setMinimized(data.minimized);
            this.setWidth(data.width);
            this.setHeight(data.height);
        }


    };



    var DragManager = {
        dragEntries: {},
        currentDrag: null,
        currentDragData: null,

        init: function(){
            document.addEventListener('mousemove', this.onMouseMove);
            document.addEventListener('mouseup', this.onMouseUp);
        },
        addDrag: function(name, onPush, onMove, onRelease){
            DragManager.dragEntries[name] = {
                onPush: onPush,
                onMove: onMove,
                onRelease: onRelease
            }
        },
        startDrag: function(name, event){
            DragManager.currentDrag = DragManager.dragEntries[name];
            DragManager.currentDragData = {};

            var args = Array.prototype.slice.call(arguments,1);
            args.unshift(DragManager.currentDragData);
            DragManager.currentDrag.onPush.apply(null, args);
            event.preventDefault();
            return false;
        },
        onMouseMove: function(e){
            if(DragManager.currentDrag){
                e.preventDefault();
                DragManager.currentDrag.onMove(DragManager.currentDragData, e);
                return false;
            }
        },
        onMouseUp: function(e){
            if(DragManager.currentDrag){
                e.preventDefault();
                if(DragManager.currentDrag.onRelease)
                    DragManager.currentDrag.onRelease(DragManager.currentDragData, e);
                DragManager.currentDrag = null;
                return false;
            }
        }
    }
    DragManager.init();
    DragManager.addDrag("dragWidth",
        function(data, event, dragPanel){
            data.startX = event.clientX;
            data.dragPanel = dragPanel;
            data.startWidth = dragPanel.getWidth();
            data.left = dragPanel.container.left;
            addClass(dragPanel.liNode, "ubplVerticalDrag");
            addClass(dragPanel.container.divNode, "ubplDragging");
        },
        function(data, event){
            var delta = event.clientX - data.startX;
            data.dragPanel.setWidth(data.startWidth + (data.left ? delta : -delta));
            dispatchEvent(data.dragPanel.liNode, 'panelresize');
        },
        function(data, event){
            removeClass(data.dragPanel.liNode, "ubplVerticalDrag");
            removeClass(data.dragPanel.container.divNode, "ubplDragging");
        }
    );
    DragManager.addDrag("dragHeight",
        function(data, event, dragPanel){
            data.startY = event.clientY;
            data.dragPanel = dragPanel;
            data.startHeight = dragPanel.getHeight();
            addClass(dragPanel.liNode, "ubplHorizontalDrag");
            addClass(dragPanel.container.divNode, "ubplDragging");
        },
        function(data, event){
            var delta = event.clientY - data.startY;
            data.dragPanel.setHeight(data.startHeight + delta);
            dispatchEvent(data.dragPanel.liNode, 'panelresize');
        },
        function(data, event){
            removeClass(data.dragPanel.liNode, "ubplHorizontalDrag");
            removeClass(data.dragPanel.container.divNode, "ubplDragging");
        }
    );
    DragManager.addDrag("dragCorner",
        function(data, event, dragPanel){
            data.startX = event.clientX;
            data.startY = event.clientY;
            data.dragPanel = dragPanel;
            data.startWidth = dragPanel.getWidth();
            data.startHeight = dragPanel.getHeight();
            data.left = dragPanel.container.left;
            addClass(dragPanel.liNode, "ubplCornerDrag");
            addClass(dragPanel.container.divNode, "ubplDragging");
        },
        function(data, event){
            var deltaX = event.clientX - data.startX,
                deltaY = event.clientY - data.startY;
            data.dragPanel.setWidth(data.startWidth + (data.left ? deltaX : -deltaX));
            data.dragPanel.setHeight(data.startHeight + deltaY);
            dispatchEvent(data.dragPanel.liNode, 'panelresize');
        },
        function(data, event){
            removeClass(data.dragPanel.liNode, "ubplCornerDrag");
            removeClass(data.dragPanel.container.divNode, "ubplDragging");
        }
    );
    DragManager.addDrag("dragPanel",
        function(data, event, dragPanel){
            data.startX = event.clientX; data.startY = event.clientY;
            data.startPos = dragPanel.getPos();
            data.panelLeft = getStylePixel(dragPanel.liNode, 'left');
            data.panelTop = getStylePixel(dragPanel.liNode, 'top');
            data.left = dragPanel.container.left;
            data.dragPanel = dragPanel;
            data.moved = false;
        },
        function(data, event){
            var deltaY = event.clientY - data.startY;
            var deltaX = event.clientX - data.startX;
            if(!data.moved && Math.abs(deltaY) + Math.abs(deltaX) > 12 ){
               addClass(data.dragPanel.liNode, "ubplPlacing");
               addClass(data.dragPanel.container.divNode, "ubplDragging");
               data.moved = true;
            }

            if(data.moved){
                if(!data.left) deltaX = -deltaX;
                data.dragPanel.setPos(data.startPos.x + deltaX, data.startPos.y + deltaY);
                handleDockPlacementHighlight(event, data.dragPanel);
            }


        },
        function(data, event){
            if(!data.moved){
                data.dragPanel.setMinimized(!data.dragPanel.minimized);
                data.dragPanel.container.reorderPanels();
                dispatchEvent(data.dragPanel.liNode, 'panelresize');
            }
            else{
                removeClass(data.dragPanel.liNode, "ubplPlacing");
                removeClass(data.dragPanel.container.divNode, "ubplDragging");
                data.dragPanel.container.reorderPanels();
                resolveDockPlacement(event, data.dragPanel);
            }
        }
    );



    var c_containers = {},
        c_panels = {};

    function handleDockPlacementHighlight(event, draggedPanel){
        for(var i in c_containers){
            var idx = c_containers[i].getPlacingIndex(event, draggedPanel);
            if(idx != -1)
                c_containers[i].showPlacingHightlight(idx, draggedPanel);
            else
                c_containers[i].clearPlacingHightlight();
        }
    }
    function resolveDockPlacement(event, draggedPanel){
        var destContainer = null, destIdx = 0;
        for(var i in c_containers){
            var idx = c_containers[i].getPlacingIndex(event, draggedPanel);
            if(idx != -1){
                destContainer = c_containers[i];
                destIdx = idx;
            }
            c_containers[i].clearPlacingHightlight();
        }
        destContainer && destContainer.placePanel(destIdx, draggedPanel);
    }

    ns.Uberpanels = {
        autosave: false,

        init: function(settings) {
            this.autosave = settings.autosave;
            this.localStorageSupported = false;
            try{
                if(window.localStorage){
                    this.localStorageSupported = true;
                }
            }
            catch(e){}

            var elements = document.querySelectorAll("div[data-ubercontainer]");
            for(var i = 0; i < elements.length; ++i) {
                this.addContainer(elements[i]);
            }
            this.loadState();

            if(this.autosave){
                window.addEventListener("unload", function(){
                    ns.Uberpanels.saveState();
                });
            }

        },

        addContainer: function(divNode) {
            var container = new UberContainer(divNode);
            c_containers[container.name] = container;
            return container;
        },

        addEventListener: function(panelName, type, listener, useCapture){
            var panel = c_panels[panelName];
            if(!panel)
                throw new Error("Uberpanels: Panel of name '" + panelName + "' does not exist");
            panel.liNode.addEventListener(type, listener, useCapture);
        },

        saveState: function(){
            var data = {};
            for(var contName in c_containers){
                data[contName] = c_containers[contName].getSaveData();
            }
            if(this.localStorageSupported){
                window.localStorage.setItem("uberPanelState", JSON.stringify(data));
            }
        },
        loadState: function(){
            var data = null;
            if(this.localStorageSupported){
                data = JSON.parse(window.localStorage.getItem("uberPanelState"));
            }
            if(data){
                for(var name in c_containers){
                    if(data[name])
                        c_containers[name].loadState(data[name]);
                }
            }
        }
    }



}(window));

