#   
按下F12打开chrome调试面板,点击左上角小箭头后可以审查元素
将鼠标移动到需要审查的元素上找到类名class="xxxxx"
然后将xxx复制到编辑器中查找到对应的位置将class='xxxx'下的img标签改成
{%- if item.properties.img == undefined -%}
          <img src="{{ item.image | product_img_url: 'small' }}" alt="{{ item.image.alt }}">
          {% else %}
      <img src="{{ item.properties.img }}" alt="{{ item.image.alt }}">
{% endif %}

