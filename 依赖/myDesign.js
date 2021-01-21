class MyDesign {
    constructor(config) {
        this.el = config.el
        this.hiddenList = config.hiddenList
        this.buildDesign = null
        this.overLayUrl = ''
        this.canvas = null
        this.buyButton = config.buyButton
        this.variantID = config.variantID
        this.aliData = null
        this.zoom = 1
        this.productInfo = null
        this.designModal = null
        this.cropperModal = null
        this.productId = config.productId
        this.cropperImg = null
        this.uploadButIndex = 0
        this.actualWidthInCan = null
        this.actualWidthDPI = 0
        this.cmToInch = 0.3937008
        this.barList = config.barList
    }
    init() {
        $.this = this
        this.hiddenBut()
        window.addEventListener('resize', this.resize, false);
        this.getOverLayerImg().then(res => {
            if (res.data.design_mode === 1) {
                $.this.appendModalElement(res.data)
                this.createCanvasFromJson(res.data.canvas_config)
                $.this.bindDesignEvent($.this.canvas)
            } else {
                $.this.appendFixedModeElment(res.data)
                this.createCanvasFromJson(res.data.canvas_config)
            }
            this.appendEntryBut(res.data)
        })
        return this
    }
    //生成字体选择框后绑定字体change事件
    createFontSelectOption() {
        const fontStyleSelect = $('#fontStyleSelect')
        fontStyleSelect.change((e) => {
            const activeFont = $.this.canvas.getActiveObject()
            e.target.style.fontFamily = fontList[fontStyleSelect.val()]
            activeFont.set('fontFamily', fontList[fontStyleSelect.val()])
            $.this.canvas.renderAll()

        })
        fontList.map((item, index) => {
            fontStyleSelect.append($(`<option value=${index} style="font-family:${item}"> <span > ${item} </span></option>`))
        })
    }
    getOverLayerImg() {
        return new Promise((res) => {
            $.ajax({
                url: designInfoUrl + '?third_product_id=' + $.this.productId,
                method: 'GET',
                dataType: 'json',
                success(data) {
                    $.this.overLayUrl = JSON.parse(data.data.canvas_config).overlayImage.src
                    $.this.productInfo = data.data
                    res(data)
                },
                error(error) {
                    console.log('get params failed: ', error);
                },
            })
        })

    }
    createCanvasFromJson(data) {
        $.this.canvas.loadFromJSON(data)
    }
    createCanvas() {
        const canvas = new fabric.Canvas($('#fabric')[0], {
            preserveObjectStacking: true,
        })

        canvas.controlsAboveOverlay = true;
        $.this.canvas = canvas
    }
    createStaticCanvas() {
        const canvas = new fabric.StaticCanvas($('#fabric')[0], {
            preserveObjectStacking: true,
        })

        canvas.controlsAboveOverlay = true;
        $.this.canvas = canvas
    }
    resize() {
        var canvasSizer = $("#myDesignModal .modal-body")[0];
        // var canvasScaleFactor = canvasSizer.offsetWidth / 525;
        const canvas = $.this.canvas
        var width = canvasSizer.offsetWidth - 32;
        var height = canvasSizer.offsetHeight;
        var ratio = $.this.canvas.getWidth() / $.this.canvas.getHeight();
        // if ((width / height) > ratio) {
        //     width = height * ratio;
        // } else {
        //     height = width / ratio;
        // }
        var scale = width / $.this.canvas.getWidth();

        var zoom = canvas.getZoom();
        this.zoom = zoom
        zoom *= scale;
        $.this.canvas.setDimensions({
            width: width,
            height: width
        });
        canvas.setViewportTransform([zoom, 0, 0, zoom, 0, 0])
        canvas.setOverlayImage($.this.overLayUrl, function () {
            canvas.overlayImage && canvas.overlayImage.scaleToWidth(width)
            canvas.renderAll()
        }, {
            originX: 'left',
            originY: 'top',
            crossOrigin: 'anonymous'
        });
    }
    hiddenBut() {
        this.hiddenList.map(item => {
            item.css('display', 'none')
        })
    }
    computedDPI() {
        const { actual_width } = $.this.productInfo
        const width = $.this.productInfo.design_params[0].width
        this.actualWidthDPI = parseInt(actual_width) / width
    }
    appendModalElement() {
        const designModal = this.buildDesignModal()
        $('body').append(designModal)
        this.designModal = designModal
        setTimeout(() => {
            // 延迟生成颜色选择
            this.buildColorPicker()
        }, 2000)
        // 生成canvas
        this.createCanvas()
        // 绑定加入购物车和立即购买
        this.bindNextEvent()
        // 加入控制栏
        this.buildControlBar()
        // 绑定控制栏事件
        this.bindEvent()
        // 添加字体选择select
        this.createFontSelectOption()
        // 禁止选择颜色跳出键盘
        this.forbidSomething()
        this.computedDPI()

    }

    appendFixedModeElment(data) {
        const cropperModal = this.buildCropperModal()
        const designModal = this.buildDesignModal()

        $('body').append(designModal).append(cropperModal)
        this.designModal = designModal
        this.cropperModal = cropperModal
        this.bindNextEvent()
        this.bindCropperModalBut()
        this.createStaticCanvas()
        this.cropperModalHiddenEvent()
        // 生成固定模式操作栏
        this.buildButtonFromFabricObject(JSON.parse(data.canvas_config))
    }
    appendEntryBut(data) {
        const _this = this
        const entryBut = this.buildEntry()
        entryBut.click(function () {
            _this.designModal.modal('toggle')
            setTimeout(() => {
                _this.resize()
            }, 500)
            return false
        })
        this.el.append(entryBut)
    }
    buildEntry() {
        return $('<button type="button" class="btn btn-primary">入口</button>')
    }
    dataURLtoBlob(dataurl) {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
    bindNextEvent() {
        $('.add-to-card').click(() => {
            const base64 = $.this.canvas.toDataURL()
            const blob = this.dataURLtoBlob(base64)
            blob.name = new Date().getTime()
            console.log($.this.canvas.toJSON())
            $.this.getAliPrams(() => $.this.uploadFile(blob, 'afterDesign', $.this.syncShopifyImg), blob)
        })
        $('.buy-it-now').click(() => {
            $.this.buyButton.click()
        })
    }
    syncShopifyImg(data) {
        console.log($.this.canvas.toJSON(['oss_file_id']))
        $.ajax({
            url: uploadImgUrl,
            method: 'POST',
            dataType: "json",
            data: { oss_file_id: data.id, design_params: $.this.canvas.toJSON(['oss_file_id']), third_product_id: $.this.productId },
            success(data) {
                $.this.addToCardPost(data.hash, data.image_src)
            },
            error() {

            },
        });
    }

    addToCardPost(hash, img) {
        const dataItem = {}
        dataItem.properties = {
            img: img + '?v=' + hash
        };
        dataItem.quantity = 1;
        dataItem.form_type = 'product';
        dataItem.utf8 = '✓';
        dataItem.variant_id = $.this.variantID;
        dataItem.id = $.this.variantID;

        $.ajax({
            url: '/cart/add.js',
            method: 'POST',
            data: dataItem,
            dataType: 'json',
            success(data) {
                window.location.reload()
            },
            error(error) {
                console.log('upload ali failed: ', error);
            },
        })
    }
    bindDesignEvent(canvas) {
        canvas.on('mouse:down', (e) => {
            if (e.target === null) {
                $.this.hiddenAndShowInput(false)
                $.this.hiddenAndShowScale(false)
            } else {
                $.this.setControlValue(e)
            }
        })
        //                 canvas.on('object:added',function(e){
        //                   $.this.setControlValue(e)
        //                 })
        canvas.on('object:scaling', (e) => {
            $('#scale').val(e.target.scaleX)
            if (e.target.type === 'image') {
                $.this.getDesignTip({ height: e.target.height, width: e.target.width, actualWidth: e.target.getScaledWidth() * $.this.actualWidthDPI * $.this.cmToInch, actualHeight: e.target.getScaledHeight() * $.this.actualWidthDPI * $.this.cmToInch })
            } else {
                $('#designTip').css('display', 'none')
            }
        })

    }
    setControlValue(e) {
        if (e.target.type === 'i-text' || e.target.type === 'text') {
            const textObj = e.target
            $.this.hiddenAndShowInput(true)
            $.this.hiddenAndShowScale(true)
            $('#fontInput').val(e.target.text)
            setTimeout(() => {
                $('#fontInput')[0].focus()
            }, 500)
            fontList.find((item, index) => {
                if (item === textObj.fontFamily)
                    $('#fontStyleSelect').val(index)
            })
            $('#scale').val(textObj.scaleX)
            $('#tp_color').val(textObj.fill)
            $('#fontStyleSelect')[0].style.fontFamily = textObj.fontFamily
        } else {
            const textObj = e.target
            $('#scale').val(textObj.scaleX)
            $.this.hiddenAndShowInput(false)
            $.this.hiddenAndShowScale(true)
        }
    }
    hiddenAndShowInput(flag, idName) {
        if (flag) {
            $('#fontInputWrap')[0].style.padding = '10px 50px'
            $('#fontInputWrap')[0].style.height = 'auto'
        } else {
            $('#fontInputWrap')[0].style.padding = 0
            $('#fontInputWrap')[0].style.overflow = 'hidden'
            $('#fontInputWrap')[0].style.height = 0
        }
    }
    hiddenAndShowScale(flag) {

        if (flag) {
            $('#scaleWrap')[0].style.padding = '10px 50px'
            $('#scaleWrap')[0].style.height = 'auto'
        } else {
            $('#scaleWrap')[0].style.padding = 0
            $('#scaleWrap')[0].style.overflow = 'hidden'
            $('#scaleWrap')[0].style.height = 0
        }
    }
    bindEvent() {
        const controls = $('#controlBar > img')
        for (let i = 0; i < controls.length; i++) {
            const control = controls[i]
            const eventArr = [() => this.selectFile('free'), this.addFontToFabric, () => this.rotate('left'), () => this.rotate('right')]
            control.onclick = eventArr[i]
        }
        //绑定放大缩小
        const scale = $('#scale')[0]
        scale.oninput = function (e) {
            //          
            const activeObject = $.this.canvas.getActiveObject()

            activeObject.scale(parseFloat(this.value)).setCoords();
            $.this.canvas.requestRenderAll();
        }
        //绑定文字输入
        $('#fontInput').on('input', (e) => {
            const activeObject = $.this.canvas.getActiveObject()
            const text = e.target.value
            activeObject.set('text', text)
            $.this.canvas.renderAll()
        })

    }
    rotate(direct) {
        const t = $.this.canvas.getActiveObject()
        direct === 'left' ?
            t && t.rotate(t.angle + 45).setCoords() : t && t.rotate(t.angle - 45).setCoords()
        $.this.canvas.renderAll()
    }

    selectFile(type, callback) {
        const inputFile = $("<input type='file'/>")
        inputFile.click()
        inputFile.change((e) => {
            const file = e.target.files[0];
            if (type === 'free') {
                $.this.getAliPrams(() => $.this.uploadFile(file, 'beforeDesign'), file)
            } else {
                $.this.getAliPrams(() => $.this.uploadFile(file, 'afterDesign', callback), file)
            }
        })
    }
    addFontToFabric() {
        const text = new fabric.Text('words', {
            left: 275,
            top: 275,
            fontSize: 50,
            originX: 'center',
            originY: 'center',
            fontFamily: 'Kirang Haerang',
            fill: '#000000'
        })
        $.this.canvas.add(text)
        $.this.canvas.setActiveObject(text)
        $.this.setControlValue({ target: text })

    }
    uploadFile(file, type, callback) {
        const { aliData } = $.this;
        let formData = new FormData();
        console.log(file)
        formData.append('name', file.name);
        formData.append('key', aliData.dir + file.name);
        formData.append('policy', aliData.policy);
        formData.append('OSSAccessKeyId', aliData.accessid);
        formData.append('success_action_status', 200);
        formData.append('callback', aliData.callback);
        formData.append('signature', aliData.signature);
        formData.append('file', file);
        $.ajax({
            url: aliData.host || uploadAliImgUrl,
            method: 'POST',
            async: true,
            cache: false,
            contentType: false,
            processData: false,
            data: formData,
            dataType: 'json',

            success(data) {
                if (data.status_code === 200) {
                    if (type === 'beforeDesign') {
                        const url = data.data.url
                        const id = data.data.id
                        $.this.addImgToCanvas(url, id)
                    } else {
                        callback && callback(data.data)
                    }

                } else {
                    console.log('upload ali failed: ', data);
                }
            },
            error(error) {
                console.log('upload ali failed: ', error);
            },
        })
    }
    getDesignTip({ actualWidth, actualHeight, height, width }) {
        const { dpi } = $.this.productInfo
        $('#designTip').css('display', 'none')
        if (dpi - (height / actualWidth) > 30) {
            $('#designTip').css('display', 'block')
        }
        if (dpi - (width / actualHeight) > 30) {
            $('#designTip').css('display', 'block')
        }
    }
    addImgToCanvas(url, id) {
        fabric.Image.fromURL(url, img => {
            const { width, height } = img
            if (width >= height) {
                img.set({
                    scaleX: ($.this.canvas.getWidth() / img.width) * 0.8,
                    scaleY: ($.this.canvas.getHeight() / img.width) * 0.8,
                    oss_file_id: id
                })
            } else {
                img.set({
                    scaleX: ($.this.canvas.getWidth() / img.height) * 0.8,
                    scaleY: ($.this.canvas.getHeight() / img.height) * 0.8,
                    oss_file_id: id,
                })
            }
            img.set({
                originX: 'center',
                originY: 'center',
                left: 275,
                top: 275,
            })
            const actualWidth = img.getScaledWidth() * $.this.actualWidthDPI * $.this.cmToInch
            const actualHeight = img.getScaledHeight() * $.this.actualWidthDPI * $.this.cmToInch
            $.this.getDesignTip({ actualWidth, actualHeight, height, width })
            $.this.canvas.add(img)
            img.sendToBack();
            $.this.canvas.setActiveObject(img)
            $.this.canvas.renderAll()
            $.this.setControlValue({ target: img })


        }, { crossOrigin: 'anonymous' })
    }
    getAliPrams(callBack, file) {
        $.ajax({
            url: aliPramsUrl,
            method: 'GET',
            dataType: 'json',
            success(data) {
                console.log(data)
                $.this.aliData = data.data;
                callBack && callBack(file);
            },
            error(error) {
                console.log('get ali failed: ', error);
            },
        })
    }
    forbidSomething() {
        $('#tp_color').on('focus', () => {
            document.activeElement.blur();
        })
        $('#scale').on('focus', () => {
            document.activeElement.blur();
        })
    }
    buildDesignModal() {
        return $(`<div class="myModal fade" id="myDesignModal" tabindex="-1" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
                  <div class="modal-dialog">
                    <div class="modal-content">
                      <div class="modal-header">
                        <h5 class="modal-title" id="exampleModalLabel"></h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                          <span aria-hidden="true">&times;</span>
                        </button>
                      </div>
                      <div class="modal-body">
                            <div id="designTip">There are not enough pixels. may affect printing quality. Please reduce the picture~</div>
                         <canvas id="fabric" height="550" width="550"></canvas>
                        <div id="controlBar">
                      
                          </div>
                           <div  id="fontInputWrap">
                            <div class="input-group mb-3">
                             <div class="input-group-prepend">
                                <span class="input-group-text" id="basic-addon1">Color</span>
                              </div>
                            <input type="text" id="tp_color" name="tp_color" maxlength="6" style="border-right:30px solid black;" value="#000000" class="form-control"/>
                            </div>

                            <div class="input-group mb-3">
                             <div class="input-group-prepend">
                                <span class="input-group-text" id="basic-addon1">Word</span>
                              </div>
                            <input type="text" id="fontInput" class="form-control"/>
                            </div>
                            <div class="input-group mb-3">
                             <div class="input-group-prepend">
                                <span class="input-group-text" id="basic-addon1"> Font </span>
                              </div>
                               <select id="fontStyleSelect" class="form-control">
                               </select>
                            </div> 
                          </div>
                        <div id="scaleWrap" style="padding-top:0px">
                        
                              <div class="input-group mb-3">
                                 <div class="input-group-prepend">
                                       <span class="input-group-text" id="basic-addon1">Scale</span>
                                  </div>
                                  <span class='form-control' style="padding-top:10px">
                                    <input type="range" id="scale" class="form-control-range " min="0.1" max="4"  step="0.1" value="1" />
                                  </span>	
                            </div> 
                          
                          </div>
                        <div id="fixedModeInput"></div>
                      </div>
                    
                      <div class="modal-footer">
                        <button type="button" class="btn btn-secondary add-to-card" >ADD TO CARD</button>
                        <button type="button" class="btn btn-primary buy-it-now">BUY IT NOW</button>
                      </div>
                    </div>
                  </div>
                </div>`)
    }
    buildControlBar() {
        // const barList = $(`<img src="{{'picture_1.png' | asset_url}}"/>	  									
        //                <img src="{{'words.png' | asset_url}}"/>				
        //                <img src="{{'turn-right.png' | asset_url}}"/>					
        //                 <img src="{{'turn-left.png' | asset_url}}"/>`)
        $('#controlBar').append($.this.barList)
    }

    buildColorPicker() {
        console.log($('#tp_color'))
        $('#tp_color').colpick({
            layout: 'hex',
            submit: 0,
            onChange: function (hsb, hex, rgb, el, bySetColor) {
                $(el).css('border-color', '#' + hex);
                const t = $.this.canvas.getActiveObject()
                t.set('fill', '#' + hex)
                $.this.canvas.renderAll()
                if (!bySetColor) $(el).val('#' + hex);
            }
        }).keyup(function () {
            $(this).colpickSetColor(this.value);
        });
    }
    buildButtonFromFabricObject(data) {
        const objectList = data.objects

        const uploadButtonWrap = $(`<ul class="list-group list-group-horizontal-xl uploadBut" style="display: flex;justify-content: space-around;"></ul>`)

        const wordInputWrap = $(`<ul class="list-group list-group-horizontal-xl wrodInput"></ul>`)

        objectList.filter(item => item.type === 'image').map((item, index) => {
            const but = $(`<button type="button" class="btn btn-secondary" style="margin-top:10px">upload${index + 1}</button>`)
            if (index === 0) {
                $.this.actualWidthDPI = parseInt($.this.productInfo.actual_width) / (item.width * item.scaleX)
            }
            but.click(() => {
                $.this.uploadButIndex = index
                $.this.actualWidthInCan = {
                    height: (item.scaleY * item.height) * $.this.actualWidthDPI,
                    width: (item.scaleX * item.width) * $.this.actualWidthDPI
                }
                $.this.selectCropperImg(item, index)
            })
            uploadButtonWrap.append(but)
        })

        objectList.filter(item => item.type === 'i-text').map((item, index) => {
            const input = $(` <div class="input-group mb-3"  style='margin-top:10px'>
                             <div class="input-group-prepend">
                        <span class="input-group-text" id="basic-addon1">word${index + 1}</span>
                                                              </div>
                                                            <input type="text" id="fontInput" class="form-control"/>
                                                            </div>`)
            input.find(`input[type='text']`).on('input', (e) => { $.this.bindFixedModeInputEvent(e, index) })
            wordInputWrap.append(input)

        })
        // 插入生成好的上传按钮和input框
        $('#fixedModeInput').append(uploadButtonWrap).append(wordInputWrap)

    }
    bindFixedModeButEvent(data) {
        const objects = $.this.canvas.getObjects()
        const changeObject = objects.filter(item => item.type === 'image')[$.this.uploadButIndex]
        const { height, width, scaleX, scaleY } = changeObject
        // 获取真实高宽
        const realHeight = height * scaleY
        const realWidth = width * scaleX
        changeObject.setSrc(data.url, (img) => {
            img.set({
                scaleY: realHeight / img.height,
                scaleX: realWidth / img.width,
                oss_file_id: data.id
            })
            $.this.canvas.renderAll()
            $.this.cropperModal.modal('toggle')
        }, { crossOrigin: 'annonymous' })
    }
    // 防止滑动穿透到body
    cropperModalHiddenEvent() {
        this.cropperModal.on('hidden.bs.modal', () => {
            $('body').addClass('modal-open')
        })
    }
    bindFixedModeInputEvent(e, index) {
        const objects = this.canvas.getObjects()
        const changeObject = objects.filter(item => item.type === 'i-text')[index]
        changeObject.set('text', e.target.value)
        $.this.canvas.renderAll()
    }
    buildCropperModal() {
        return $(`<div class="myModal fade" id="myCropperModal" tabindex="-2" role="dialog" aria-labelledby="cropperModalLabel" aria-hidden="true" data-backdrop="false">
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div class="modal-body">
              <div id="cropperTip">There are not enough pixels. may affect printing quality. Please enlarge the crop box or shrink the picture~</div>
                <div style="width:100%" id="cropperWrap"></div>
              </div>
              <div class="modal-footer">
                <button type="button" class="cropper btn btn-primary" >ENTER</button>
                <button type="button" class="btn btn-secondary  cancel">CANCEL</button>
              </div>
            </div>
          </div>
        </div>`)
    }
    bindCropperModalBut() {
        $('.cropper').click(() => {
            console.log(this.uploadButIndex)
            var cas = this.cropperImg.cropper('getCroppedCanvas');
            var base64url = cas.toDataURL('image/jpeg');
            const file = this.dataURLtoBlob(base64url)
            console.log(file)
            file.name = new Date().getTime()
            this.getAliPrams(() => $.this.uploadFile(
                file,
                'afterDesign',
                $.this.bindFixedModeButEvent
            ), file)
        })
        $('.cancel').click(() => {
            this.cropperModal.modal('toggle')
        })
    }
    getImgHeightAndWidth(base64url, callback) {
        const img = new Image()
        img.src = base64url
        img.onload = (e) => {
            // console.log(img.height, img.width)
            callBack({ height: img.height, width: img.width })
        }
    }
    selectCropperImg(item, index) {
        const inputFile = $("<input type='file'/>")
        inputFile.click()
        inputFile.change((e) => {
            const file = e.target.files[0]
            $.this.blobToDataURL(file, (base64) => { $.this.buildCropperArea(item, base64) })
        })
    }
    blobToDataURL(blob, callback) {
        var reader = new FileReader();
        reader.onload = function (e) {
            callback(e.target.result);
        }
        reader.readAsDataURL(blob);
    }
    buildCropperArea(item, base64) {
        var $image = $(`<img id="image" src="${base64}" style="width:100%"/>`);
        $image.cropper({
            aspectRatio: (item.width * item.scaleX) / (item.height * item.scaleY),
            viewMode: 1,
            crop(e) {
                const { dpi } = $.this.productInfo
                console.log(dpi)
                console.log(e.detail.width, e.detail.height, $.this.actualWidthDPI, $.this.actualWidthInCan)
                const dpiX = e.detail.width / ($.this.actualWidthInCan.width * $.this.cmToInch)
                const dpiY = e.detail.height / ($.this.actualWidthInCan.height * $.this.cmToInch)
                console.log(dpiY, dpiX)
                $('#cropperTip').css("display", 'none')

                if (dpi - dpiX >= 10) {
                    $('#cropperTip').css("display", 'block')
                }
                if (dpi - dpiY >= 10) {
                    $('#cropperTip').css("display", 'block')
                }
            }
        });
        this.cropperImg = $image
        $('#cropperWrap').empty().append($image)
        $.this.cropperModal.modal('toggle')
    }
}
window.MyDesign = MyDesign