while read resource; do
    echo "Destroying $resource"
    terraform destroy -auto-approve -target="$resource"
done < changed_resources.txt