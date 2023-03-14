#!/bin/bash

# Example of array declaration:
# declare -a arr=("0xA0EcE74981AF3eD84D4659fe1F469E7c47e5Ed33" "0xA0EcE74981AF3eD84D4659fe1F469E7c47e5Ed33")

declare -a arr=("")
## now loop through the above array
i=0
len=${#arr[@]}
while [ $i -lt $len ]; do
   echo "$i"
   # or do whatever with individual element of the array
   export NODE_TLS_REJECT_UNAUTHORIZED=0 && node index.js "${arr[$i]}"
   let i++
done
