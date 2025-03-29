
export type DynamicFormFieldType = { label: string; value?: any, type: string; key: string; disabled?: boolean }
const FormField = ({field}: { field: DynamicFormFieldType }) => {
    switch (field.type) {
        case 'text':
            return <div style={{width: "100%", marginBottom: "15px"}}>
                <label htmlFor={field.key}
                       style={{display: "block", marginBottom: "5px", color: "#333", fontSize: "16px"}}>
                    {field.label}
                </label>
                <input custom-attribute={"df"}
                       style={{
                           width: "100%",
                           padding: "8px 10px",
                           border: "1px solid #ccc",
                           borderRadius: "4px",
                           fontSize: "14px",
                           color: "#333",
                           boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)"
                       }}
                       defaultValue={field.value}
                       type="text"
                       disabled={field.disabled}
                       id={field.key}
                       name={field.key}
                       placeholder={field.label}
                       required
                />
            </div>;

        case 'textarea':

            return <div>
                <label htmlFor={field.key}>
                    {field.label}
                </label>
                <p>
                <textarea custom-attribute={"df"} defaultValue={field.value} id={field.key} disabled={field.disabled}
                          name={field.key}
                          placeholder={field.label}
                          required></textarea>
                </p>
                <br/>
            </div>;
        case "richtext":
            return <div>
                <label htmlFor={field.key}>
                    {field.label}
                </label>:
                <script src="https://cdn.ckeditor.com/ckeditor5/41.2.1/classic/ckeditor.js"></script>
                <div datatype={"richtext"} id={field.key} dangerouslySetInnerHTML={{__html: field.value}}></div>
                <script dangerouslySetInnerHTML={{
                    __html: `
                ClassicEditor
                    .create( document.querySelector( '#${field.key}' ) )
                    .then( editor => {
                    window.editors =  window.editors || {};
                    window.editors[${field.key}.id] = editor;
                } )
                    .catch( error => {
                    console.error(error);
                } );
                `
                }}>
                </script>
            </div>
        default:
            return null;
    }
};
const DynamicForm = ({id, postTo, fields, submitLabel, redirectTo}: {
    id: string,
    postTo: string,
    fields: DynamicFormFieldType[],
    submitLabel: string,
    redirectTo: string
}) => (
    <>
        <form id={id}>
            <div style={{display: "flex", flexDirection: "column"}}>
                {fields.map((field, index) => (
                    <FormField key={index} field={field}/>
                ))}
                <button type="submit">{submitLabel}</button>
            </div>
        </form>
        <script type="application/javascript" dangerouslySetInnerHTML={{
            __html: `document.getElementById('${id}')
    .addEventListener('submit', function (event) {
        event.preventDefault(); // Prevent the form from submitting the traditional way

    const formData = {};
    event.target.querySelectorAll('input, textarea').forEach(input => {
        if(input.attributes.getNamedItem("custom-attribute")?.value === "df") 
            formData[input.name] = input.name === 'tags' ? input.value.split(',') : input.value;
    });
    
    event.target.querySelectorAll('div[datatype="richtext"]').forEach(div => {
        formData[div.id] = window.editors[div.id].getData()
    });
    

        fetch('${postTo}', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                window.location.replace('${redirectTo}')
                console.log('Success:', data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    });
`
        }}>
        </script>
    </>
);
export default DynamicForm
